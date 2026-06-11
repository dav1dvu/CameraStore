import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role: 'ADMIN' | 'NHANVIENBAN' | 'NHANVIENTHUE';
    fullName: string;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        data: null,
        error: 'Authorization token missing or invalid'
      });
    }

    const token = authHeader.split(' ')[1];
    
    const mockUsers: Record<string, { id: string; role: 'ADMIN' | 'NHANVIENBAN' | 'NHANVIENTHUE'; email: string; firstName: string; lastName: string; phone: string; identity: string }> = {
      'mock-access-token': {
        id: 'd4444444-4444-4444-4444-444444444444',
        role: 'ADMIN',
        email: 'admin@camera.com',
        firstName: 'Admin',
        lastName: 'Developer',
        phone: '0901234567',
        identity: '123456789'
      },
      'mock-access-token-admin': {
        id: 'd4444444-4444-4444-4444-444444444444',
        role: 'ADMIN',
        email: 'admin@camera.com',
        firstName: 'Admin',
        lastName: 'Developer',
        phone: '0901234567',
        identity: '123456789'
      },
      'mock-access-token-banmayfilm': {
        id: 'ba111111-1111-1111-1111-111111111111',
        role: 'NHANVIENBAN',
        email: 'banmayfilm@camera.com',
        firstName: 'Nhân viên',
        lastName: 'Bán Máy Film',
        phone: '0901111111',
        identity: '111111111'
      },
      'mock-access-token-muonmaychut': {
        id: 'ba222222-2222-2222-2222-222222222222',
        role: 'NHANVIENTHUE',
        email: 'muonmaychut@camera.com',
        firstName: 'Nhân viên',
        lastName: 'Mượn Máy Chút',
        phone: '0902222222',
        identity: '222222222'
      }
    };

    if (mockUsers[token]) {
      const mUser = mockUsers[token];
      try {
        const { error: upsertErr } = await supabaseAdmin.from('users').upsert({
          id: mUser.id,
          role: mUser.role,
          first_name: mUser.firstName,
          last_name: mUser.lastName,
          email: mUser.email,
          password_hash: 'SUPABASE_AUTH_MANAGED',
          phone_number: mUser.phone,
          identity_number: mUser.identity,
          is_active: true
        });
        if (upsertErr) {
          console.error(`Failed to upsert mock user (${mUser.email}):`, upsertErr);
        }
      } catch (err) {
        console.error(`Failed to upsert mock user exception (${mUser.email}):`, err);
      }

      req.user = {
        id: mUser.id,
        email: mUser.email,
        role: mUser.role,
        fullName: `${mUser.firstName} ${mUser.lastName}`
      };
      return next();
    }
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: 'Invalid or expired authentication session'
      });
    }

    // Fetch matching user profile from database to get custom role
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role, first_name, last_name, is_active')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Auto-create missing user profile (occurs if db schema was reset but auth users persist)
      const userMeta = user.user_metadata || {};
      const newRole = userMeta.role || 'ADMIN';
      const firstName = userMeta.first_name || 'Staff';
      const lastName = userMeta.last_name || user.id.substring(0, 6);

      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          role: newRole,
          first_name: firstName,
          last_name: lastName,
          email: user.email || '',
          password_hash: 'SUPABASE_AUTH_MANAGED',
          is_active: true
        })
        .select('role, first_name, last_name, is_active')
        .single();

      if (insertError || !newProfile) {
        console.error('Failed to auto-create missing user profile:', insertError);
        return res.status(401).json({
          success: false,
          data: null,
          error: 'User profile not found and auto-creation failed'
        });
      }
      profile = newProfile;
    }

    if (profile.is_active === false) {
      return res.status(401).json({
        success: false,
        data: null,
        error: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: profile.role as 'ADMIN' | 'NHANVIENBAN' | 'NHANVIENTHUE',
      fullName: `${profile.first_name} ${profile.last_name}`
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: ('ADMIN' | 'NHANVIENBAN' | 'NHANVIENTHUE')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: 'Forbidden: Insufficient privileges for this operation'
      });
    }

    next();
  };
}
