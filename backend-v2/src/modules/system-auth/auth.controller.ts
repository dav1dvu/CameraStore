import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, supabaseAnon } from '../../config/supabase.js';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middlewares/auth.middleware.js';

const updateUserStatusSchema = z.object({
  isActive: z.boolean({
    required_error: 'isActive is required'
  })
});

const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự')
});

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, fullName, firstName, lastName, phone, role } = req.body;

      if (!email || !password || (!fullName && !firstName)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Missing email, password, fullName or firstName'
        });
      }

      // Check role assignment, default is NHANVIENBAN
      const assignedRole = role && ['ADMIN', 'NHANVIENBAN', 'NHANVIENTHUE'].includes(role) ? role : 'NHANVIENBAN';

      let fName = firstName || '';
      let lName = lastName || '';

      if (!fName && fullName) {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length > 1) {
          fName = parts.slice(0, -1).join(' ');
          lName = parts[parts.length - 1];
        } else {
          fName = parts[0] || 'Staff';
          lName = '';
        }
      }

      if (!fName) fName = 'Staff';

      // Create authentication record on Supabase
      const { data, error } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: fName,
            last_name: lName,
            full_name: fullName || `${fName} ${lName}`.trim(),
            phone_number: phone || '',
            phone: phone || '',
            role: assignedRole // Pass custom role to metadata
          }
        }
      });

      if (error || !data.user) {
        return res.status(400).json({
          success: false,
          data: null,
          error: error?.message || 'Registration failed'
        });
      }

      res.status(201).json({
        success: true,
        data: {
          id: data.user.id,
          email: data.user.email,
          fullName: fullName || `${fName} ${lName}`.trim(),
          role: assignedRole
        },
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, fullName, firstName, lastName, phone } = req.body;

      if (!email || !password || (!fullName && !firstName)) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Missing email, password, fullName or firstName'
        });
      }

      let fName = firstName || '';
      let lName = lastName || '';

      if (!fName && fullName) {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length > 1) {
          fName = parts.slice(0, -1).join(' ');
          lName = parts[parts.length - 1];
        } else {
          fName = parts[0] || 'User';
          lName = '';
        }
      }

      if (!fName) fName = 'User';

      // Create authentication record on Supabase with ADMIN role
      const { data, error } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: fName,
            last_name: lName,
            full_name: fullName || `${fName} ${lName}`.trim(),
            phone_number: phone || '',
            phone: phone || '',
            role: 'ADMIN' // Default to ADMIN for public signup
          }
        }
      });

      if (error || !data.user) {
        return res.status(400).json({
          success: false,
          data: null,
          error: error?.message || 'Registration failed'
        });
      }

      res.status(201).json({
        success: true,
        data: {
          id: data.user.id,
          email: data.user.email,
          fullName: fullName || `${fName} ${lName}`.trim(),
          role: 'ADMIN'
        },
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Email/Username and password are required'
        });
      }

      let normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail === 'admin') normalizedEmail = 'admin@camera.com';
      else if (normalizedEmail === 'banmayfilm') normalizedEmail = 'banmayfilm@camera.com';
      else if (normalizedEmail === 'muonmaychut') normalizedEmail = 'muonmaychut@camera.com';

      // Mock logins
      if (normalizedEmail === 'admin@camera.com' && password === 'admin123') {
        return res.status(200).json({
          success: true,
          data: {
            user: {
              id: 'd4444444-4444-4444-4444-444444444444',
              email: 'admin@camera.com',
              role: 'ADMIN',
              fullName: 'Admin Developer'
            },
            session: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
              expiresAt: Math.floor(Date.now() / 1000) + 3600
            }
          },
          error: null
        });
      }

      if (normalizedEmail === 'banmayfilm@camera.com' && password === 'bmf123') {
        return res.status(200).json({
          success: true,
          data: {
            user: {
              id: 'ba111111-1111-1111-1111-111111111111',
              email: 'banmayfilm@camera.com',
              role: 'NHANVIENBAN',
              fullName: 'Nhân viên Bán Máy Film'
            },
            session: {
              accessToken: 'mock-access-token-banmayfilm',
              refreshToken: 'mock-refresh-token-banmayfilm',
              expiresAt: Math.floor(Date.now() / 1000) + 3600
            }
          },
          error: null
        });
      }

      if (normalizedEmail === 'muonmaychut@camera.com' && password === 'mmc123') {
        return res.status(200).json({
          success: true,
          data: {
            user: {
              id: 'ba222222-2222-2222-2222-222222222222',
              email: 'muonmaychut@camera.com',
              role: 'NHANVIENTHUE',
              fullName: 'Nhân viên Mượn Máy Chút'
            },
            session: {
              accessToken: 'mock-access-token-muonmaychut',
              refreshToken: 'mock-refresh-token-muonmaychut',
              expiresAt: Math.floor(Date.now() / 1000) + 3600
            }
          },
          error: null
        });
      }

      // Log in via Supabase client to fetch token and session
      const { data, error } = await supabaseAnon.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (error || !data.session) {
        return res.status(401).json({
          success: false,
          data: null,
          error: error?.message || 'Invalid credentials'
        });
      }

      // Retrieve user's role and details
      let { data: profile } = await supabaseAdmin
        .from('users')
        .select('role, first_name, last_name, is_active')
        .eq('id', data.user.id)
        .single();

      if (!profile) {
        // Auto-create missing user profile (occurs if db schema was reset but auth users persist)
        const userMeta = data.user.user_metadata || {};
        const newRole = userMeta.role || 'NHANVIENBAN';
        const firstName = userMeta.first_name || 'Staff';
        const lastName = userMeta.last_name || data.user.id.substring(0, 6);

        const { data: newProfile, error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: data.user.id,
            role: newRole,
            first_name: firstName,
            last_name: lastName,
            email: data.user.email || '',
            password_hash: 'SUPABASE_AUTH_MANAGED',
            is_active: true
          })
          .select('role, first_name, last_name, is_active')
          .single();

        if (newProfile) {
          profile = newProfile;
        } else {
          console.error('Failed to auto-create missing user profile on login:', insertError);
        }
      }

      if (profile && profile.is_active === false) {
        await supabaseAdmin.auth.admin.signOut(data.session.access_token);
        return res.status(401).json({
          success: false,
          data: null,
          error: 'Tài khoản đã bị vô hiệu hóa'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: data.user.id,
            email: data.user.email,
            role: profile?.role || 'NHANVIENBAN',
            fullName: profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Staff'
          },
          session: {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at
          }
        },
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        // Terminate session server-side
        await supabaseAdmin.auth.admin.signOut(token);
      }

      res.status(200).json({
        success: true,
        data: { message: 'Logged out successfully' },
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUserStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const targetUserId = req.params.id;
      const staffId = req.user!.id;
      const parsed = updateUserStatusSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: parsed.error.errors.map(e => e.message).join(', ')
        });
      }

      const { isActive } = parsed.data;

      // Update users table
      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ is_active: isActive })
        .eq('id', targetUserId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            data: null,
            error: 'User not found'
          });
        }
        throw error;
      }



      res.status(200).json({
        success: true,
        data: {
          id: data.id,
          email: data.email,
          is_active: data.is_active
        },
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminResetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const targetUserId = req.params.id;
      const staffId = req.user!.id;
      const parsed = adminResetPasswordSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          data: null,
          error: parsed.error.errors.map(e => e.message).join(', ')
        });
      }

      const { newPassword } = parsed.data;

      // Get target user info first for logging and verifying existence
      const { data: targetUser, error: findErr } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('id', targetUserId)
        .single();

      if (findErr) {
        if (findErr.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            data: null,
            error: 'User not found'
          });
        }
        throw findErr;
      }

      // Update password using Supabase Auth admin API
      const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { password: newPassword }
      );

      if (resetErr) throw resetErr;



      res.status(200).json({
        success: true,
        data: { message: 'Reset mật khẩu thành công' },
        error: null
      });
    } catch (error) {
      next(error);
    }
  }

  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, role, is_active, phone_number, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
        role: u.role,
        isActive: u.is_active !== false,
        phone: u.phone_number,
        createdAt: u.created_at
      }));

      res.status(200).json({
        success: true,
        data: formatted,
        error: null
      });
    } catch (error) {
      next(error);
    }
  }
}

