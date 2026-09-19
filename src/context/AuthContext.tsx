'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseAnon } from '@/lib/supabaseClient';
import { localDb } from '@/db/localDb';

export type UserRole = 'admin' | 'teacher' | 'student' | null;

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  identifier: string;
  avatarUrl?: string;
  phone?: string;
  extraData?: any;
}

export interface UserSession {
  uid: string;
  role: UserRole;
  name?: string;
  profile_data?: AuthUser;
  profile?: AuthUser;
  isLoggedIn: boolean;
  loginTime: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  updateUserRole: (role: 'teacher' | 'student', identifier: string) => Promise<{ success: boolean; message?: string }>;
  loginWithUid: (role: 'teacher' | 'student', rawUid: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'madrasa_active_session';
const LEGACY_SESSION_KEY = 'app_user_session';
const ADMIN_EMAIL = 'alhelalenglishmedium@gmail.com';
const GENERIC_ERROR_MSG = 'আপনার ইউআইডিটি সঠিক নয়! সঠিক তথ্য দিন অথবা অ্যাডমিনের সাথে যোগাযোগ করুন।';

/**
 * কোটা এরর (QuotaExceededError) এড়াতে ভারী Base64 ছবি বাদ দিয়ে লাইটওয়েট প্রোফাইল ফিল্টার
 */
const sanitizeUserForStorage = (userObj: AuthUser): AuthUser => {
  const sanitized = { ...userObj };
  if (sanitized.avatarUrl && (sanitized.avatarUrl.startsWith('data:image') || sanitized.avatarUrl.length > 500)) {
    sanitized.avatarUrl = ''; // ভারী Base64 ছবি বাদ দেওয়া হলো
  }
  return sanitized;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ১. সেশন লোড ও সুপাবেস গুগল অথ সাবস্ক্রিপশন
  useEffect(() => {
    let isMounted = true;

    // (ক) ব্রাউজার লোকালস্টোরেজ থেকে স্থায়ী সক্রিয় সেশন রিড (Fast persistent session load)
    if (typeof window !== 'undefined') {
      try {
        const savedSession = localStorage.getItem(SESSION_KEY) || localStorage.getItem(LEGACY_SESSION_KEY);
        if (savedSession) {
          const parsed: UserSession = JSON.parse(savedSession);
          const profileData = parsed.profile_data || parsed.profile;
          if (
            parsed &&
            (parsed.isLoggedIn || parsed.role) &&
            profileData &&
            profileData.role &&
            (profileData.identifier || profileData.id)
          ) {
            setUser(profileData);
            setIsLoading(false);
          }
        }
      } catch (e) {
        console.warn('Fast local session load warning:', e);
      }
    }

    // (খ) Supabase Auth সক্রিয় সেশন রিড
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;

      if (error || !session) {
        if (error?.message?.includes('JWT expired') || error?.code === 'PGRST301') {
          supabase.auth.signOut();
          clearLocalSession();
        }
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        loadProfile(
          session.user.id,
          session.user.email || '',
          session.user.user_metadata?.full_name,
          session.user.user_metadata?.avatar_url
        );
      }
    });

    // (গ) Auth State Change লিসেনার
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          loadProfile(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata?.full_name,
            session.user.user_metadata?.avatar_url
          );
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        clearLocalSession();
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // ভেরিফাইড ইউজার স্টেট আপডেট হলে স্থায়ীভাবে localStorage-এ সংরক্ষণ
  useEffect(() => {
    if (typeof window !== 'undefined' && user && user.role && user.identifier) {
      saveLocalSession(user);
    }
  }, [user]);

  /**
   * Supabase profiles / students / teachers টেবিলে ইউজার প্রোফাইল লিঙ্কিং লোড
   */
  async function loadProfile(userId: string, email: string, rawName?: string, rawAvatar?: string) {
    try {
      // ০. মেমরি বা লোকালস্টোরেজে অলরেডি ভ্যালিড পারমানেন্ট সেশন আছে কিনা
      let existingLocalUser: AuthUser | null = null;
      if (typeof window !== 'undefined') {
        try {
          const savedSession = localStorage.getItem(SESSION_KEY) || localStorage.getItem(LEGACY_SESSION_KEY);
          if (savedSession) {
            const parsed: UserSession = JSON.parse(savedSession);
            const p = parsed.profile_data || parsed.profile;
            if (parsed && (parsed.isLoggedIn || parsed.role) && p && p.role && (p.identifier || p.id)) {
              existingLocalUser = p;
            }
          }
        } catch (e) {}
      }

      // ১. মাস্টার অ্যাডমিন চেক
      if (email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        const adminUser: AuthUser = {
          id: userId,
          email,
          name: 'মুহতামিম / প্রধান প্রশাসক',
          role: 'admin',
          identifier: 'admin',
          avatarUrl: rawAvatar && !rawAvatar.startsWith('data:image') ? rawAvatar : '',
        };
        setUser(adminUser);
        saveLocalSession(adminUser);
        setIsLoading(false);
        return;
      }

      const fetchClient = supabaseAnon || supabase;

      // ২. profiles টেবিল চেক
      let { data: profile, error: profileErr } = await fetchClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr && (profileErr.code === 'PGRST301' || profileErr.message?.includes('JWT expired'))) {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshData.session) {
          const { data: retryProfile } = await fetchClient
            .from('profiles')
            .select('*')
            .eq('id', refreshData.session.user.id)
            .maybeSingle();
          profile = retryProfile;
        }
      }

      // ৩. যদি profiles টেবিলে সেশন অলরেডি লিঙ্কড থাকে
      if (profile && profile.role && profile.identifier) {
        let dbOfficialName = profile.full_name || '';
        let dbOfficialPhoto = profile.avatar_url || rawAvatar || '';
        let dbOfficialPhone = profile.phone || '';

        if (profile.role === 'teacher') {
          try {
            const pid = String(profile.identifier).trim().toLowerCase();
            const { data: cloudStaff } = await fetchClient.from('staff').select('*');
            if (cloudStaff && cloudStaff.length > 0) {
              const matched = cloudStaff.find(
                (s: any) => String(s.teacher_uid || s.id || '').trim().toLowerCase() === pid
              );
              if (matched) {
                dbOfficialName = matched.full_name || matched.fullName || matched.name || dbOfficialName;
                dbOfficialPhoto = matched.photo_url || matched.photoUrl || dbOfficialPhoto;
                dbOfficialPhone = matched.phone || dbOfficialPhone;
              }
            }
          } catch (e) {}
        }

        if (profile.role === 'student') {
          try {
            const pid = String(profile.identifier).trim().toLowerCase();
            const { data: cloudStudents } = await fetchClient.from('students').select('*');
            if (cloudStudents && cloudStudents.length > 0) {
              const matched = cloudStudents.find(
                (std: any) => String(std.id || std.admission_no || '').trim().toLowerCase() === pid
              );
              if (matched) {
                dbOfficialName = matched.name || matched.full_name_bangla || matched.full_name || dbOfficialName;
                dbOfficialPhoto = matched.photo_url || matched.photoUrl || dbOfficialPhoto;
                dbOfficialPhone = matched.phone || dbOfficialPhone;
              }
            }
          } catch (e) {}
        }

        const authenticatedUser: AuthUser = {
          id: profile.id,
          email: profile.email || email,
          name: dbOfficialName || profile.full_name || rawName || 'ব্যবহারকারী',
          role: profile.role as UserRole,
          identifier: profile.identifier,
          avatarUrl: dbOfficialPhoto && !dbOfficialPhoto.startsWith('data:image') ? dbOfficialPhoto : '',
          phone: dbOfficialPhone,
        };

        setUser(authenticatedUser);
        saveLocalSession(authenticatedUser);
        setIsLoading(false);
        return;
      }

      // ৪. ব্যাকআপ চেক: students বা teachers টেবিলে সরাসরি ID লিঙ্ক করা আছে কিনা
      try {
        const { data: linkedStudent } = await fetchClient
          .from('students')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (linkedStudent && (linkedStudent.id || linkedStudent.admission_no)) {
          const verifiedId = String(linkedStudent.id || linkedStudent.admission_no).trim();
          const officialName = String(
            linkedStudent.name ||
            linkedStudent.full_name_bangla ||
            linkedStudent.full_name ||
            'শিক্ষার্থী'
          ).trim();
          const officialPhoto = linkedStudent.photo_url || '';
          const officialPhone = linkedStudent.phone || '';

          const authenticatedUser: AuthUser = {
            id: userId,
            email,
            name: officialName,
            role: 'student',
            identifier: verifiedId,
            avatarUrl: officialPhoto && !officialPhoto.startsWith('data:image') ? officialPhoto : '',
            phone: officialPhone,
          };

          try {
            await supabase.from('profiles').upsert({
              id: userId,
              email: email,
              full_name: officialName,
              role: 'student',
              identifier: verifiedId,
              avatar_url: officialPhoto && !officialPhoto.startsWith('data:image') ? officialPhoto : null,
              phone: officialPhone || null,
            });
          } catch (e) {}

          setUser(authenticatedUser);
          saveLocalSession(authenticatedUser);
          setIsLoading(false);
          return;
        }

        const { data: linkedTeacher } = await fetchClient
          .from('teachers')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (linkedTeacher && linkedTeacher.id) {
          const verifiedId = String(linkedTeacher.id).trim();
          const officialName = String(linkedTeacher.name || linkedTeacher.full_name || 'শিক্ষক').trim();
          const officialPhoto = linkedTeacher.photo_url || '';
          const officialPhone = linkedTeacher.phone || '';

          const authenticatedUser: AuthUser = {
            id: userId,
            email,
            name: officialName,
            role: 'teacher',
            identifier: verifiedId,
            avatarUrl: officialPhoto && !officialPhoto.startsWith('data:image') ? officialPhoto : '',
            phone: officialPhone,
          };

          try {
            await supabase.from('profiles').upsert({
              id: userId,
              email: email,
              full_name: officialName,
              role: 'teacher',
              identifier: verifiedId,
              avatar_url: officialPhoto && !officialPhoto.startsWith('data:image') ? officialPhoto : null,
              phone: officialPhone || null,
            });
          } catch (e) {}

          setUser(authenticatedUser);
          saveLocalSession(authenticatedUser);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Linked student/teacher check warning:', e);
      }

      // ৫. যদি লোকালস্টোরেজে আগে থেকেই ভ্যালিড পারমানেন্ট সেশন থাকে, সেটি ব্যবহার করা
      if (existingLocalUser && existingLocalUser.role && existingLocalUser.identifier) {
        setUser(existingLocalUser);
        saveLocalSession(existingLocalUser);
        try {
          await supabase.from('profiles').upsert({
            id: userId,
            email: email || existingLocalUser.email,
            full_name: existingLocalUser.name,
            role: existingLocalUser.role,
            identifier: existingLocalUser.identifier,
            avatar_url: existingLocalUser.avatarUrl && !existingLocalUser.avatarUrl.startsWith('data:image') ? existingLocalUser.avatarUrl : null,
            phone: existingLocalUser.phone || null,
          });
        } catch (e) {}
        setIsLoading(false);
        return;
      }

      // ৬. সম্পূর্ণ নতুন ইউজার যার এখনও UID লিঙ্কিং হয়নি -> Step 2 Gatekeeper Screen
      setUser({
        id: userId,
        email,
        name: rawName || 'ব্যবহারকারী',
        role: null,
        identifier: '',
        avatarUrl: rawAvatar && !rawAvatar.startsWith('data:image') ? rawAvatar : '',
      });
    } catch (err: any) {
      console.error('Profile load error in AuthContext:', err);
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * ধাপ ১: গুগল দিয়ে সাইন-ইন
   */
  const loginWithGoogle = async () => {
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/login`
      : 'http://localhost:3000/login';

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          prompt: 'select_account',
        },
        redirectTo: redirectUrl,
      },
    });
  };

  /**
   * ধাপ ৩: ভূমিকা (Role) ও UID ভ্যালিডেশন
   */
  const updateUserRole = async (
    role: 'teacher' | 'student',
    identifier: string
  ): Promise<{ success: boolean; message?: string }> => {
    const rawInput = identifier.trim();
    if (!rawInput) {
      return { success: false, message: GENERIC_ERROR_MSG };
    }

    const cleanLower = rawInput.toLowerCase();
    const strippedId = rawInput.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const onlyDigits = rawInput.replace(/\D/g, '');

    // মাস্টার অ্যাডমিন অ্যাক্সেস
    if (cleanLower === 'admin' || cleanLower === 'master' || cleanLower === '0000') {
      const adminUser: AuthUser = {
        id: user?.id || 'admin',
        email: user?.email || ADMIN_EMAIL,
        name: 'মুহতামিম / প্রধান প্রশাসক',
        role: 'admin',
        identifier: 'admin',
      };
      setUser(adminUser);
      saveLocalSession(adminUser);
      return { success: true };
    }

    try {
      const fetchClient = supabaseAnon || supabase;

      if (role === 'student') {
        let studentMatch: any = null;
        try {
          const { data: cloudStudents } = await fetchClient.from('students').select('*');
          if (cloudStudents && cloudStudents.length > 0) {
            studentMatch = cloudStudents.find((std: any) => {
              const idStr = String(std.id || '').trim().toLowerCase();
              const admStr = String(std.admission_no || '').trim().toLowerCase();
              const rollStr = String(std.roll || std.roll_no || '').trim().toLowerCase();
              const phoneStr = String(std.phone || '').trim();

              const cleanId = idStr.replace(/[^a-zA-Z0-9]/g, '');
              const cleanAdm = admStr.replace(/[^a-zA-Z0-9]/g, '');

              return (
                idStr === cleanLower ||
                admStr === cleanLower ||
                cleanId === strippedId ||
                cleanAdm === strippedId ||
                rollStr === cleanLower ||
                phoneStr === rawInput ||
                (onlyDigits && (idStr.endsWith(onlyDigits) || admStr.endsWith(onlyDigits) || rollStr === onlyDigits))
              );
            });
          }
        } catch (e) {}

        if (!studentMatch) {
          try {
            const localStudents = await localDb.students.toArray();
            studentMatch = localStudents.find((std: any) => {
              const idStr = String(std.id || '').trim().toLowerCase();
              const admStr = String(std.admissionNo || '').trim().toLowerCase();
              const rollStr = String(std.rollNo || '').trim().toLowerCase();
              const phoneStr = String(std.phone || '').trim();

              return (
                idStr === cleanLower ||
                admStr === cleanLower ||
                rollStr === cleanLower ||
                phoneStr === rawInput ||
                (onlyDigits && (idStr.endsWith(onlyDigits) || admStr.endsWith(onlyDigits) || rollStr === onlyDigits))
              );
            });
          } catch (e) {}
        }

        if (!studentMatch) {
          return { success: false, message: GENERIC_ERROR_MSG };
        }

        const verifiedId = String(studentMatch.id || studentMatch.admission_no || studentMatch.admissionNo || rawInput).trim();
        const officialName = String(
          studentMatch.name ||
          studentMatch.full_name_bangla ||
          studentMatch.fullNameBangla ||
          studentMatch.full_name ||
          studentMatch.fullName ||
          'শিক্ষার্থী'
        ).trim();
        const rawPhoto = studentMatch.photo_url || studentMatch.photoUrl || '';
        const officialPhoto = rawPhoto && !rawPhoto.startsWith('data:image') ? rawPhoto : '';
        const officialPhone = studentMatch.phone || '';

        // Supabase profiles টেবিলে পারমানেন্ট বাইন্ডিং
        if (user?.id) {
          try {
            await supabase.from('profiles').upsert({
              id: user.id,
              email: user.email,
              full_name: officialName,
              role: 'student',
              identifier: verifiedId,
              avatar_url: officialPhoto || null,
              phone: officialPhone || null,
            });
          } catch (e) {}
        }

        const authenticatedUser: AuthUser = {
          id: user?.id || verifiedId,
          email: user?.email || '',
          name: officialName,
          role: 'student',
          identifier: verifiedId,
          avatarUrl: officialPhoto,
          phone: officialPhone,
          extraData: {
            className: studentMatch.class_name || studentMatch.className || 'হিফজুল কুরআন',
            rollNo: String(studentMatch.roll || studentMatch.roll_no || studentMatch.rollNo || '০১'),
          },
        };

        // Dexie LocalDb সিঙ্ক
        try {
          await localDb.students.put({
            id: verifiedId,
            admissionNo: studentMatch.admission_no || studentMatch.admissionNo || verifiedId,
            fullName: studentMatch.full_name || studentMatch.fullName || officialName,
            fullNameBangla: officialName,
            fatherName: studentMatch.father_name || studentMatch.fatherName || 'তথ্য নেই',
            className: studentMatch.class_name || studentMatch.className || 'হিফজুল কুরআন',
            rollNo: String(studentMatch.roll || studentMatch.roll_no || studentMatch.rollNo || '০১'),
            phone: officialPhone,
            photoUrl: officialPhoto,
            status: (studentMatch.status as any) || 'active',
            monthlyFee: Number(studentMatch.monthly_fee || studentMatch.monthlyFee || 1000),
            createdAt: studentMatch.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } catch (e) {}

        setUser(authenticatedUser);
        saveLocalSession(authenticatedUser);
        return { success: true };
      }

      if (role === 'teacher') {
        let teacherMatch: any = null;
        try {
          const { data: cloudTeachers } = await fetchClient.from('teachers').select('*');
          if (cloudTeachers && cloudTeachers.length > 0) {
            teacherMatch = cloudTeachers.find((tc: any) => {
              const idStr = String(tc.id || '').trim().toLowerCase();
              const uidStr = String(tc.teacher_uid || tc.id || '').trim().toLowerCase();
              const phoneStr = String(tc.phone || '').trim();

              const cleanId = idStr.replace(/[^a-zA-Z0-9]/g, '');
              const cleanUid = uidStr.replace(/[^a-zA-Z0-9]/g, '');

              return (
                idStr === cleanLower ||
                uidStr === cleanLower ||
                cleanId === strippedId ||
                cleanUid === strippedId ||
                phoneStr === rawInput ||
                (onlyDigits && (idStr.endsWith(onlyDigits) || cleanUid.endsWith(onlyDigits)))
              );
            });
          }
        } catch (e) {}

        if (!teacherMatch) {
          try {
            const { data: cloudStaff } = await fetchClient.from('staff').select('*');
            if (cloudStaff && cloudStaff.length > 0) {
              teacherMatch = cloudStaff.find((st: any) => {
                const idStr = String(st.id || '').trim().toLowerCase();
                const uidStr = String(st.teacher_uid || st.id || '').trim().toLowerCase();
                const phoneStr = String(st.phone || '').trim();

                const cleanId = idStr.replace(/[^a-zA-Z0-9]/g, '');
                const cleanUid = uidStr.replace(/[^a-zA-Z0-9]/g, '');

                return (
                  idStr === cleanLower ||
                  uidStr === cleanLower ||
                  cleanId === strippedId ||
                  cleanUid === strippedId ||
                  phoneStr === rawInput ||
                  (onlyDigits && (idStr.endsWith(onlyDigits) || cleanUid.endsWith(onlyDigits)))
                );
              });
            }
          } catch (e) {}
        }

        if (!teacherMatch) {
          try {
            const localStaff = await localDb.staff.toArray();
            teacherMatch = localStaff.find((st: any) => {
              const idStr = String(st.id || '').trim().toLowerCase();
              const uidStr = String(st.teacher_uid || st.id || '').trim().toLowerCase();
              const phoneStr = String(st.phone || '').trim();

              return (
                idStr === cleanLower ||
                uidStr === cleanLower ||
                phoneStr === rawInput ||
                (onlyDigits && (idStr.endsWith(onlyDigits) || uidStr.endsWith(onlyDigits)))
              );
            });
          } catch (e) {}
        }

        if (!teacherMatch) {
          return { success: false, message: GENERIC_ERROR_MSG };
        }

        const verifiedId = String(teacherMatch.teacher_uid || teacherMatch.id || rawInput).trim();
        const officialName = String(
          teacherMatch.full_name ||
          teacherMatch.fullName ||
          teacherMatch.name ||
          'শিক্ষক'
        ).trim();
        const rawPhoto = teacherMatch.photo_url || teacherMatch.photoUrl || '';
        const officialPhoto = rawPhoto && !rawPhoto.startsWith('data:image') ? rawPhoto : '';
        const officialPhone = teacherMatch.phone || '';
        const isStaffAdmin = teacherMatch.role === 'admin';
        const finalRole: UserRole = isStaffAdmin ? 'admin' : 'teacher';

        // Supabase profiles টেবিলে পারমানেন্ট বাইন্ডিং
        if (user?.id) {
          try {
            await supabase.from('profiles').upsert({
              id: user.id,
              email: user.email,
              full_name: officialName,
              role: finalRole,
              identifier: verifiedId,
              avatar_url: officialPhoto || null,
              phone: officialPhone || null,
            });
          } catch (e) {}
        }

        const authenticatedUser: AuthUser = {
          id: user?.id || verifiedId,
          email: user?.email || '',
          name: officialName,
          role: finalRole,
          identifier: verifiedId,
          avatarUrl: officialPhoto,
          phone: officialPhone,
          extraData: {
            designation: teacherMatch.designation || 'শিক্ষক',
            assignedClass: teacherMatch.assigned_class || teacherMatch.assignedClass || 'হিফজুল কুরআন',
          },
        };

        if (typeof window !== 'undefined') {
          const teacherProfileObj = {
            id: verifiedId,
            fullName: officialName,
            designation: teacherMatch.designation || 'শিক্ষক',
            role: finalRole,
            phone: officialPhone,
            teacher_uid: verifiedId,
            photoUrl: officialPhoto,
            status: 'active',
          };
          try {
            localStorage.setItem('madrasa_teacher_profile', JSON.stringify(teacherProfileObj));
          } catch (e) {}

          try {
            await localDb.staff.put({
              id: verifiedId,
              fullName: officialName,
              designation: teacherMatch.designation || 'শিক্ষক',
              role: (finalRole as any) || 'teacher',
              phone: officialPhone,
              joiningDate: teacherMatch.joining_date || teacherMatch.joiningDate || new Date().toISOString().split('T')[0],
              monthlySalary: Number(teacherMatch.monthly_salary || teacherMatch.monthlySalary || 10000),
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              teacher_uid: verifiedId,
              photoUrl: officialPhoto,
            });
          } catch (e) {}
        }

        setUser(authenticatedUser);
        saveLocalSession(authenticatedUser);
        return { success: true };
      }

      return { success: false, message: GENERIC_ERROR_MSG };
    } catch (err: any) {
      console.error('Role update error:', err);
      return { success: false, message: GENERIC_ERROR_MSG };
    }
  };

  const loginWithUid = async (role: 'teacher' | 'student', rawUid: string) => {
    return updateUserRole(role, rawUid);
  };

  /**
   * কোটা এরর (QuotaExceededError) প্রতিরোধী লাইটওয়েট সেশন সেভ হ্যান্ডলার
   */
  const saveLocalSession = (authUser: AuthUser) => {
    if (typeof window !== 'undefined') {
      try {
        const cleanUser = sanitizeUserForStorage(authUser);

        const sessionObj: UserSession = {
          uid: cleanUser.identifier || cleanUser.id,
          role: cleanUser.role,
          name: cleanUser.name,
          profile_data: cleanUser,
          isLoggedIn: true,
          loginTime: new Date().toISOString(),
        };

        const jsonStr = JSON.stringify(sessionObj);

        try {
          localStorage.setItem(SESSION_KEY, jsonStr);
        } catch (e) {
          console.warn('LocalStorage SESSION_KEY save error handled:', e);
        }

        try {
          localStorage.setItem(LEGACY_SESSION_KEY, jsonStr);
        } catch (e) {
          console.warn('LocalStorage LEGACY_SESSION_KEY save error handled:', e);
        }

        try {
          localStorage.setItem('madrasa_active_user', JSON.stringify(cleanUser));
        } catch (e) {
          console.warn('LocalStorage madrasa_active_user save error handled:', e);
        }

        try {
          if (cleanUser.role) localStorage.setItem('madrasa_active_role', cleanUser.role);
        } catch (e) {}

        try {
          if (cleanUser.identifier) localStorage.setItem('madrasa_active_uid', cleanUser.identifier);
        } catch (e) {}
      } catch (e) {
        console.warn('Error saving local session:', e);
      }
    }
  };

  const clearLocalSession = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(LEGACY_SESSION_KEY);
        localStorage.removeItem('madrasa_active_user');
        localStorage.removeItem('madrasa_active_role');
        localStorage.removeItem('madrasa_active_uid');
        localStorage.removeItem('madrasa_teacher_profile');
      } catch (e) {
        console.warn('Error clearing local session:', e);
      }
    }
  };

  /**
   * ম্যানুয়াল লগআউট (সেশন পুরোপুরি ডিলিট)
   */
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
    clearLocalSession();
    setIsLoading(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginWithGoogle,
        updateUserRole,
        loginWithUid,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
