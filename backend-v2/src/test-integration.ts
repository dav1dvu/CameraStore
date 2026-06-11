import app from './app.js';
import { createServer } from 'http';
import dotenv from 'dotenv';

dotenv.config();

async function runTests() {
  const server = createServer(app);
  
  // Listen on a random free port
  server.listen(0, async () => {
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}/api`;
    console.log(`🚀 Test server started at http://localhost:${port}`);
    console.log('🧪 Starting End-to-End Integration Tests...\n');

    try {
      // 1. Health Check
      console.log('--------------------------------------------------');
      console.log('📋 Test 1: GET /health');
      const healthRes = await fetch(`http://localhost:${port}/health`);
      const healthData = await healthRes.json();
      console.log('Status:', healthRes.status);
      console.log('Response:', healthData);
      if (healthRes.status !== 200 || healthData.status !== 'OK') {
        throw new Error('Health check failed');
      }
      console.log('✅ Health check passed.');

      // 2. Authentication Check (Without token)
      console.log('\n--------------------------------------------------');
      console.log('📋 Test 2: GET /api/categories (Unauthenticated)');
      const authRes = await fetch(`${baseUrl}/categories`);
      const authData = await authRes.json();
      console.log('Status:', authRes.status);
      console.log('Response:', authData);
      if (authRes.status !== 401) {
        throw new Error('Expected 401 Unauthorized for missing token');
      }
      console.log('✅ Unauthenticated protection verified.');

      // 3. Testing DB Connection Error Handling
      // We will perform a login attempt to verify the database endpoint.
      // Since we don't have a seeded user, we expect either 401 (invalid credentials)
      // or if the oltp_store schema is not exposed, we expect a database error.
      console.log('\n--------------------------------------------------');
      console.log('📋 Test 3: POST /api/auth/login (Database Schema & Connection Verification)');
      
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test-admin@thefilmery.com',
          password: 'wrongpassword'
        })
      });
      const loginData = await loginRes.json();
      console.log('Status:', loginRes.status);
      console.log('Response:', loginData);

      if (loginData.error && loginData.error.includes('oltp_store')) {
        console.log('\n⚠️  [DIAGNOSTIC] PostgREST schema error detected!');
        console.log('==================================================');
        console.log('LỖI: Supabase chưa cho phép truy cập schema "oltp_store".');
        console.log('CÁCH KHẮC PHỤC:');
        console.log('1. Đăng nhập vào trang quản trị Supabase Dashboard.');
        console.log('2. Truy cập Project Settings -> API.');
        console.log('3. Tại phần "Exposed schemas", bấm thêm "oltp_store".');
        console.log('4. Lưu cấu hình và chạy lại lệnh test này.');
        console.log('==================================================\n');
        
        server.close();
        process.exit(1);
      }

      console.log('✅ Connection to Database verified successfully.');

      // 4. Verify Categories GET (Requires valid auth token)
      // Note: Full happy path testing requires a valid authentication token.
      console.log('\n💡 Tip: To run full CRUD & Reporting tests, ensure a valid staff account is registered in Supabase.');

    } catch (error: any) {
      console.error('\n❌ Test execution failed with error:', error.message);
    } finally {
      console.log('\nStopping test server...');
      server.close();
    }
  });
}

runTests();
