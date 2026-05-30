<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/network.svg" alt="AMNTDDA Logo" width="100" />

  # AMNTDDA
  **Attention Mechanism Neural Network for Drug-Disease Association Prediction**

  [![React](https://img.shields.io/badge/Frontend-React.js-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Build-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
  [![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
  [![JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
  <br/>
  [![Python](https://img.shields.io/badge/Language-Python_3.10+-3776AB?style=flat-square&logo=python)](https://www.python.org/)
  [![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![PyTorch](https://img.shields.io/badge/AI_Model-PyTorch-EE4C2C?style=flat-square&logo=pytorch)](https://pytorch.org/)
  [![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=flat-square&logo=sqlite)](https://sqlite.org/)
</div>

<br />

## 🌟 Giới thiệu Dự án

**AMNTDDA** (Attention Mechanism Neural Network for Drug-Disease Association) là một hệ thống ứng dụng công nghệ Trí tuệ Nhân tạo (Học sâu) tích hợp Cơ chế Chú ý (Attention Mechanism) để phân tích và dự đoán mối liên kết tiềm năng giữa Thuốc (Drug) và Bệnh (Disease).

Dự án cung cấp một giao diện quản trị chuyên nghiệp, cho phép các nhà nghiên cứu y sinh học, bác sĩ và người dùng dễ dàng:
- Khám phá và tra cứu tương tác Thuốc - Bệnh.
- Trực quan hóa cấu trúc phân tử của thuốc qua biểu đồ phân tử tương tác.
- So sánh hiệu suất mô hình thông qua các độ đo tiên tiến (AUC, AUPR, F1, MCC).
- Quản trị hệ thống, phân quyền người dùng và nhật ký hoạt động chi tiết.

---

## ✨ Tính năng Nổi bật

- 🚀 **Dự đoán Liên kết (Prediction):** Sử dụng mô hình Deep Learning có độ chính xác cao.
- 📊 **Thống kê & Trực quan (Analytics):** Dashboard báo cáo thời gian thực về dữ liệu (C-dataset, F-dataset) và hiệu suất.
- 🧬 **Cấu trúc Phân tử:** Tích hợp SMILES Drawer để hiển thị trực quan cấu trúc hóa học phân tử thuốc.
- 🔐 **Bảo mật & Phân quyền:** Xác thực JWT an toàn, quản lý người dùng 2 cấp độ (Admin / User), bao gồm tính năng khôi phục mật khẩu.
- 🎨 **Giao diện Hiện đại (UI/UX):** Glassmorphism, Dark mode, Fully Responsive.

---

## 🛠️ Cài đặt Môi trường (Installation)

### 1. Yêu cầu hệ thống
- **Python**: Phiên bản 3.10 hoặc mới hơn.
- **Node.js**: Phiên bản 16.x hoặc mới hơn (khuyên dùng bản LTS).
- **Trình quản lý gói**: `npm` hoặc `yarn`, `pip`.

#### Danh sách phiên bản thư viện Python chính (Đã kiểm thử):
| Thư viện | Phiên bản | Mô tả |
| :--- | :---: | :--- |
| `torch` | `2.9.0` | Thư viện tensor và học sâu |
| `torch-geometric` | `2.7.0` | Thư viện Graph Neural Networks |
| `pandas` | `2.3.3` | Xử lý dữ liệu bảng (CSV) |
| `numpy` | `2.2.6` | Tính toán số học đại số tuyến tính |
| `fastapi` | `0.135.3` | Framework backend API chính |
| `uvicorn` | `0.44.0` | ASGI server chạy FastAPI |
| `sqlalchemy` | `2.0.49` | ORM kết nối SQLite Database |
| `scikit-learn` | `1.7.2` | Đánh giá chỉ số hiệu năng (AUC, AUPR) |


### 2. Tải mã nguồn
```bash
git clone https://github.com/luan0867596981-dv/AMGDT_v2.git
cd AMGDT_v2
```

### 3. Cài đặt Backend (FastAPI / Python)
Di chuyển vào thư mục dự án và thiết lập môi trường ảo Python:
```bash
# Tạo môi trường ảo (Virtual Environment)
python -m venv venv

# Kích hoạt môi trường (Windows)
venv\Scripts\activate
# (Nếu dùng MacOS/Linux): source venv/bin/activate

# Cài đặt các thư viện cần thiết
pip install -r requirements.txt
```

### 4. Cài đặt Frontend (React / Vite)
Di chuyển vào thư mục Frontend và cài đặt thư viện Javascript:
```bash
cd frontend
npm install
# hoặc: yarn install
```

---

## 🚀 Hướng dẫn Khởi chạy (Running the Application)

Để hệ thống hoạt động đầy đủ, bạn cần khởi chạy song song cả **Backend** và **Frontend** ở 2 cửa sổ Terminal khác nhau.

### Terminal 1: Khởi động Backend (FastAPI Server)
```bash
# Đảm bảo bạn đang ở thư mục gốc của dự án và đã kích hoạt (activate) môi trường ảo
uvicorn main:app --reload
```
> Server API sẽ chạy tại: `http://127.0.0.1:8000`

### Terminal 2: Khởi động Frontend (React UI)
```bash
# Mở một cửa sổ Terminal mới
cd frontend
npm run dev
# hoặc: yarn dev
```
> Trình duyệt sẽ tự động mở giao diện ứng dụng tại: `http://localhost:5173`

---


