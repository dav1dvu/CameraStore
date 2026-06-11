import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { supabaseAdmin } from './config/supabase.js';
import { CategoryService } from './modules/inventory/category.service.js';
import { CameraModelService } from './modules/inventory/camera-model.service.js';
import { ReportingService } from './modules/reporting/reporting.service.js';

async function runLiveTests() {
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TRỰC TIẾP TRÊN SUPABASE CLOUD...');
  console.log('==================================================');

  try {
    // 0. Lấy Staff ID thực tế trong bảng users để tránh lỗi vi phạm khóa ngoại
    const { data: users, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role')
      .limit(1);

    if (userErr) throw userErr;
    
    let staffId = 'd4444444-4444-4444-4444-444444444444'; // fallback ID
    if (users && users.length > 0) {
      staffId = users[0].id;
      console.log(`👤 Đã tìm thấy tài khoản nhân viên thật trong DB: ID="${staffId}", Email="${users[0].email}", Role="${users[0].role}"`);
    } else {
      console.log('⚠️ Cảnh báo: Bảng users đang trống. Sử dụng ID nhân viên giả lập.');
    }

    // 1. Kiểm thử CRUD Category
    console.log('\n--- 1. KIỂM THỬ CRUD DANH MỤC (CATEGORY) ---');
    
    // Đọc danh sách hiện có
    const initialCategories = await CategoryService.getCategories();
    console.log(`📊 Số danh mục hiện có: ${initialCategories.length}`);

    // Tạo danh mục mới
    console.log(`➕ Đang tạo danh mục mới...`);
    const newCat = await CategoryService.createCategory({
      name: 'Danh mục Test Supabase ' + Date.now()
    }, staffId);
    console.log('✅ Tạo danh mục thành công! ID:', newCat.id);

    // Cập nhật danh mục
    console.log('📝 Đang cập nhật tên danh mục...');
    const updatedCat = await CategoryService.updateCategory(newCat.id, {
      name: 'Danh mục Test Supabase - Đã sửa'
    }, staffId);
    console.log('✅ Cập nhật danh mục thành công! Tên mới:', updatedCat.name);

    // Xóa danh mục (dọn dẹp sau khi test)
    console.log('❌ Đang xóa danh mục test để làm sạch DB...');
    const delResult = await CategoryService.deleteCategory(newCat.id, staffId);
    console.log('✅ Xóa danh mục test thành công:', delResult);


    // 2. Kiểm thử Camera Model list
    console.log('\n--- 2. KIỂM THỬ LIÊN KẾT MẪU MÁY ẢNH (CAMERA MODEL) ---');
    const cameraModels = await CameraModelService.listCameraModels({});
    console.log(`✅ Lấy danh sách mẫu máy thuê thành công! Số lượng: ${cameraModels.length}`);
    if (cameraModels.length > 0) {
      console.log('Mẫu máy đầu tiên:', {
        id: cameraModels[0].id,
        model_name: cameraModels[0].model_name,
        rent_price_per_day: cameraModels[0].rent_price_per_day
      });
    }


    // 3. Kiểm thử các Báo cáo phân tích (Reporting & Analytics)
    console.log('\n--- 3. KIỂM THỬ BÁO CÁO DOANH THU & THIẾT BỊ ---');
    
    console.log('📈 Đang chạy báo cáo doanh thu năm 2026...');
    const revenueReport = await ReportingService.getRevenueReport(2026, 'monthly') as any;
    console.log('✅ Báo cáo doanh thu thành công! Phân tích 3 tháng đầu năm:');
    Object.keys(revenueReport).slice(0, 3).forEach((monthKey) => {
      console.log(`- ${monthKey}:`, revenueReport[monthKey]);
    });

    console.log('\n📉 Đang chạy báo cáo top thiết bị được thuê nhiều nhất...');
    const topRentals = await ReportingService.getTopRentals(5);
    console.log(`✅ Báo cáo top rentals thành công! Số lượng trả về: ${topRentals.length}`);
    topRentals.forEach((item: any, idx: number) => {
      console.log(`  [Top ${idx + 1}] ${item.modelName} - ${item.rentalCount} lượt thuê`);
    });

    console.log('\n🔧 Đang chạy báo cáo phân tích trạng thái thiết bị trong kho...');
    const conditionReport = await ReportingService.getEquipmentConditionReport();
    console.log(`✅ Báo cáo hiện trạng thành công! Tổng số máy cho thuê: ${conditionReport.totalEquipments}`);
    conditionReport.breakdown.forEach((b: any) => {
      console.log(`  - ${b.status}: ${b.count} máy (${b.percentage}%)`);
    });

    console.log('\n==================================================');
    console.log('🎉 TẤT CẢ CÁC BÀI KIỂM THỬ TRÊN SUPABASE CLOUD ĐÃ PASS THÀNH CÔNG!');

  } catch (error: any) {
    console.error('\n❌ KIỂM THỬ THẤT BẠI VỚI LỖI:');
    console.error(error);
    process.exit(1);
  }
}

runLiveTests();
