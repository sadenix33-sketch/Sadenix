// ===== PATIENTS =====
export const patients = [
  { id: 'P001', name: 'أحمد محمود الخالدي', age: 35, gender: 'ذكر', phone: '0791234567', email: 'ahmed@email.com', lastVisit: '28/03/2026', nextAppointment: '05/04/2026', balance: -120, status: 'active', tag: 'VIP', bloodType: 'A+', city: 'عمان', joinDate: '15/01/2024' },
  { id: 'P002', name: 'سارة عبدالله العمري', age: 28, gender: 'أنثى', phone: '0795678901', email: 'sara@email.com', lastVisit: '25/03/2026', nextAppointment: '02/04/2026', balance: 0, status: 'active', tag: null, bloodType: 'O+', city: 'إربد', joinDate: '20/03/2024' },
  { id: 'P003', name: 'محمد علي الزيادات', age: 45, gender: 'ذكر', phone: '0799876543', email: 'mohmmed@email.com', lastVisit: '20/03/2026', nextAppointment: null, balance: -350, status: 'active', tag: null, bloodType: 'B+', city: 'الزرقاء', joinDate: '10/06/2023' },
  { id: 'P004', name: 'نور حسين الطراونة', age: 22, gender: 'أنثى', phone: '0796543210', email: 'nour@email.com', lastVisit: '18/03/2026', nextAppointment: '07/04/2026', balance: 0, status: 'active', tag: 'جديد', bloodType: 'AB+', city: 'عمان', joinDate: '01/03/2026' },
  { id: 'P005', name: 'خالد عمر الشريف', age: 52, gender: 'ذكر', phone: '0798765432', email: 'khalid@email.com', lastVisit: '10/03/2026', nextAppointment: '10/04/2026', balance: -60, status: 'active', tag: 'VIP', bloodType: 'A-', city: 'العقبة', joinDate: '05/09/2022' },
  { id: 'P006', name: 'ريم أحمد المصري', age: 31, gender: 'أنثى', phone: '0797654321', email: 'reem@email.com', lastVisit: '05/03/2026', nextAppointment: null, balance: 0, status: 'inactive', tag: null, bloodType: 'O-', city: 'عمان', joinDate: '12/07/2023' },
  { id: 'P007', name: 'عمر يوسف الحوراني', age: 40, gender: 'ذكر', phone: '0794321098', email: 'omar@email.com', lastVisit: '01/03/2026', nextAppointment: '08/04/2026', balance: -180, status: 'active', tag: null, bloodType: 'B-', city: 'السلط', joinDate: '28/02/2023' },
  { id: 'P008', name: 'لينا صالح القضاة', age: 26, gender: 'أنثى', phone: '0793210987', email: 'lena@email.com', lastVisit: '27/03/2026', nextAppointment: '04/04/2026', balance: 0, status: 'active', tag: 'جديد', bloodType: 'A+', city: 'إربد', joinDate: '10/03/2026' },
  { id: 'P009', name: 'فارس نايف العجلوني', age: 38, gender: 'ذكر', phone: '0792109876', email: 'fares@email.com', lastVisit: '22/03/2026', nextAppointment: '06/04/2026', balance: -90, status: 'active', tag: null, bloodType: 'O+', city: 'عمان', joinDate: '14/11/2023' },
  { id: 'P010', name: 'دانا محمود الربايعة', age: 19, gender: 'أنثى', phone: '0791098765', email: 'dana@email.com', lastVisit: '30/03/2026', nextAppointment: '03/04/2026', balance: 0, status: 'active', tag: 'جديد', bloodType: 'AB-', city: 'عمان', joinDate: '01/04/2026' },
  { id: 'P011', name: 'سامر إبراهيم الرشيد', age: 44, gender: 'ذكر', phone: '0799012345', email: 'samer@email.com', lastVisit: '15/03/2026', nextAppointment: null, balance: -220, status: 'active', tag: 'VIP', bloodType: 'A+', city: 'عمان', joinDate: '08/01/2022' },
  { id: 'P012', name: 'هالة علي العبادي', age: 33, gender: 'أنثى', phone: '0798901234', email: 'hala@email.com', lastVisit: '12/03/2026', nextAppointment: '11/04/2026', balance: -45, status: 'active', tag: null, bloodType: 'B+', city: 'عمان', joinDate: '22/04/2024' },
];

// ===== APPOINTMENTS =====
export const appointments = [
  { id: 'A001', patientId: 'P001', patient: 'أحمد محمود الخالدي', doctor: 'د. صدام العتوم', date: '01/04/2026', time: '09:00', duration: 60, type: 'تقويم أسنان', status: 'مؤكد', room: 'غرفة 1', notes: 'مراجعة التقويم الشهرية', reminderSent: true },
  { id: 'A002', patientId: 'P002', patient: 'سارة عبدالله العمري', doctor: 'د. رنا المحيسن', date: '01/04/2026', time: '10:00', duration: 45, type: 'تنظيف أسنان', status: 'تم تسجيل الوصول', room: 'غرفة 2', notes: '', reminderSent: true },
  { id: 'A003', patientId: 'P003', patient: 'محمد علي الزيادات', doctor: 'د. كريم الشريف', date: '01/04/2026', time: '11:00', duration: 90, type: 'خلع ضرس', status: 'محجوز', room: 'غرفة 3', notes: 'إجراء تخدير موضعي', reminderSent: false },
  { id: 'A004', patientId: 'P004', patient: 'نور حسين الطراونة', doctor: 'د. صدام العتوم', date: '01/04/2026', time: '12:30', duration: 60, type: 'تقييم تقويم', status: 'محجوز', room: 'غرفة 1', notes: '', reminderSent: true },
  { id: 'A005', patientId: 'P005', patient: 'خالد عمر الشريف', doctor: 'د. رنا المحيسن', date: '01/04/2026', time: '14:00', duration: 30, type: 'حشو سن', status: 'مكتمل', room: 'غرفة 2', notes: '', reminderSent: true },
  { id: 'A006', patientId: 'P006', patient: 'ريم أحمد المصري', doctor: 'د. لمى الزعبي', date: '01/04/2026', time: '15:00', duration: 45, type: 'كشف عام', status: 'ملغي', room: 'غرفة 4', notes: 'أبلغت بالإلغاء', reminderSent: true },
  { id: 'A007', patientId: 'P007', patient: 'عمر يوسف الحوراني', doctor: 'د. كريم الشريف', date: '01/04/2026', time: '16:00', duration: 120, type: 'زراعة سن', status: 'محجوز', room: 'غرفة 3', notes: 'جلسة زراعة أول', reminderSent: false },
  { id: 'A008', patientId: 'P008', patient: 'لينا صالح القضاة', doctor: 'د. رنا المحيسن', date: '02/04/2026', time: '09:30', duration: 45, type: 'تبييض أسنان', status: 'محجوز', room: 'غرفة 2', notes: '', reminderSent: false },
  { id: 'A009', patientId: 'P009', patient: 'فارس نايف العجلوني', doctor: 'د. صدام العتوم', date: '02/04/2026', time: '11:00', duration: 60, type: 'مراجعة تقويم', status: 'محجوز', room: 'غرفة 1', notes: '', reminderSent: false },
  { id: 'A010', patientId: 'P010', patient: 'دانا محمود الربايعة', doctor: 'د. لمى الزعبي', date: '03/04/2026', time: '10:00', duration: 30, type: 'فحص أطفال', status: 'محجوز', room: 'غرفة 4', notes: 'أول زيارة', reminderSent: false },
];

// ===== STAFF =====
export const staff = [
  { id: 'S001', name: 'د. صدام العتوم', role: 'طبيب تقويم', specialization: 'تقويم الأسنان', phone: '0791111111', email: 'saddam@sadenix.jo', status: 'active', patientsToday: 6, completedThisMonth: 48, rating: 4.9, calendarSync: true, workingHours: '08:00 - 17:00', joinDate: '01/01/2020' },
  { id: 'S002', name: 'د. رنا المحيسن', role: 'طبيبة عامة', specialization: 'طب الأسنان العام', phone: '0792222222', email: 'rana@sadenix.jo', status: 'active', patientsToday: 8, completedThisMonth: 62, rating: 4.8, calendarSync: true, workingHours: '09:00 - 18:00', joinDate: '15/03/2021' },
  { id: 'S003', name: 'د. كريم الشريف', role: 'جراح أسنان', specialization: 'جراحة الفم والفكين', phone: '0793333333', email: 'karim@sadenix.jo', status: 'active', patientsToday: 4, completedThisMonth: 35, rating: 4.9, calendarSync: false, workingHours: '10:00 - 19:00', joinDate: '01/06/2021' },
  { id: 'S004', name: 'د. لمى الزعبي', role: 'طبيبة أطفال', specialization: 'طب أسنان الأطفال', phone: '0794444444', email: 'lama@sadenix.jo', status: 'active', patientsToday: 5, completedThisMonth: 41, rating: 5.0, calendarSync: true, workingHours: '08:00 - 16:00', joinDate: '10/09/2022' },
  { id: 'S005', name: 'سماح العكور', role: 'مسؤولة استقبال', specialization: null, phone: '0795555555', email: 'samah@sadenix.jo', status: 'active', patientsToday: null, completedThisMonth: null, rating: null, calendarSync: false, workingHours: '08:00 - 17:00', joinDate: '20/02/2022' },
  { id: 'S006', name: 'راما حجازي', role: 'مساعدة طبية', specialization: null, phone: '0796666666', email: 'rama@sadenix.jo', status: 'active', patientsToday: null, completedThisMonth: null, rating: null, calendarSync: false, workingHours: '09:00 - 18:00', joinDate: '01/05/2023' },
  { id: 'S007', name: 'أيمن السليمان', role: 'محاسب', specialization: null, phone: '0797777777', email: 'ayman@sadenix.jo', status: 'active', patientsToday: null, completedThisMonth: null, rating: null, calendarSync: false, workingHours: '08:00 - 17:00', joinDate: '15/01/2022' },
];

// ===== INVOICES =====
export const invoices = [
  { id: 'INV-2026-001', patientId: 'P001', patient: 'أحمد محمود الخالدي', date: '28/03/2026', items: [{ name: 'مراجعة تقويم', cost: 25 }, { name: 'تركيب أسلاك', cost: 95 }], total: 120, paid: 0, status: 'غير مدفوعة', method: null, doctor: 'د. صدام العتوم' },
  { id: 'INV-2026-002', patientId: 'P002', patient: 'سارة عبدالله العمري', date: '25/03/2026', items: [{ name: 'تنظيف أسنان', cost: 35 }, { name: 'طلاء الفلورايد', cost: 15 }], total: 50, paid: 50, status: 'مدفوعة', method: 'بطاقة', doctor: 'د. رنا المحيسن' },
  { id: 'INV-2026-003', patientId: 'P003', patient: 'محمد علي الزيادات', date: '20/03/2026', items: [{ name: 'خلع ضرس عقل', cost: 120 }, { name: 'مضادات حيوية', cost: 25 }, { name: 'مسكنات ألم', cost: 15 }], total: 160, paid: 0, status: 'متأخرة', method: null, doctor: 'د. كريم الشريف' },
  { id: 'INV-2026-004', patientId: 'P004', patient: 'نور حسين الطراونة', date: '18/03/2026', items: [{ name: 'كشف وتقييم', cost: 20 }, { name: 'أشعة بانورامية', cost: 40 }], total: 60, paid: 60, status: 'مدفوعة', method: 'نقدي', doctor: 'د. صدام العتوم' },
  { id: 'INV-2026-005', patientId: 'P005', patient: 'خالد عمر الشريف', date: '10/03/2026', items: [{ name: 'حشو مركب', cost: 60 }], total: 60, paid: 0, status: 'غير مدفوعة', method: null, doctor: 'د. رنا المحيسن' },
  { id: 'INV-2026-006', patientId: 'P007', patient: 'عمر يوسف الحوراني', date: '01/03/2026', items: [{ name: 'زراعة سن - جلسة أولى', cost: 350 }, { name: 'أشعة CBCT', cost: 80 }], total: 430, paid: 250, status: 'مدفوعة جزئياً', method: 'بطاقة', doctor: 'د. كريم الشريف' },
  { id: 'INV-2026-007', patientId: 'P009', patient: 'فارس نايف العجلوني', date: '22/03/2026', items: [{ name: 'مراجعة تقويم', cost: 25 }, { name: 'تعديل أسلاك', cost: 65 }], total: 90, paid: 0, status: 'غير مدفوعة', method: null, doctor: 'د. صدام العتوم' },
  { id: 'INV-2026-008', patientId: 'P011', patient: 'سامر إبراهيم الرشيد', date: '15/03/2026', items: [{ name: 'تركيب تاج خزفي', cost: 220 }], total: 220, paid: 0, status: 'متأخرة', method: null, doctor: 'د. رنا المحيسن' },
];

// ===== TREATMENTS CATALOG =====
export const treatments = [
  { id: 'T001', name: 'كشف وتشخيص', category: 'عام', price: 20, duration: 30, description: 'فحص شامل للأسنان واللثة' },
  { id: 'T002', name: 'تنظيف الأسنان', category: 'عام', price: 35, duration: 45, description: 'إزالة الجير والترسبات' },
  { id: 'T003', name: 'حشو مركب', category: 'ترميم', price: 55, duration: 45, description: 'حشو بالراتنج المركب' },
  { id: 'T004', name: 'حشو أملغم', category: 'ترميم', price: 40, duration: 45, description: 'حشو معدني تقليدي' },
  { id: 'T005', name: 'علاج عصب', category: 'علاج الجذور', price: 150, duration: 90, description: 'علاج قناة الجذر' },
  { id: 'T006', name: 'خلع سن بسيط', category: 'جراحة', price: 40, duration: 20, description: 'خلع بسيط تحت تخدير موضعي' },
  { id: 'T007', name: 'خلع ضرس عقل', category: 'جراحة', price: 120, duration: 60, description: 'خلع جراحي' },
  { id: 'T008', name: 'تركيب تاج خزفي', category: 'تركيبات', price: 220, duration: 60, description: 'تاج بورسلين عالي الجودة' },
  { id: 'T009', name: 'جسر أسنان', category: 'تركيبات', price: 450, duration: 90, description: 'جسر ثابت لتعويض الأسنان المفقودة' },
  { id: 'T010', name: 'زراعة سن', category: 'زراعة', price: 600, duration: 120, description: 'زراعة بالتيتانيوم' },
  { id: 'T011', name: 'تقويم أسنان ثابت', category: 'تقويم', price: 1200, duration: 60, description: 'تقويم معدني ثابت' },
  { id: 'T012', name: 'تقويم شفاف', category: 'تقويم', price: 1800, duration: 60, description: 'Invisalign' },
  { id: 'T013', name: 'تبييض أسنان', category: 'تجميل', price: 150, duration: 90, description: 'تبييض بالأوزون' },
  { id: 'T014', name: 'فينير خزفي', category: 'تجميل', price: 180, duration: 90, description: 'قشور خزفية تجميلية' },
];

// ===== INVENTORY =====
export const inventory = [
  { id: 'I001', name: 'قفازات لاتكس', category: 'مستلزمات', unit: 'صندوق', stock: 8, minStock: 10, expiry: '12/2027', supplier: 'شركة الطب للتوريدات', unitCost: 3.5 },
  { id: 'I002', name: 'أسلاك تقويم 0.14', category: 'تقويم', unit: 'علبة', stock: 5, minStock: 3, expiry: null, supplier: 'Ormco', unitCost: 45 },
  { id: 'I003', name: 'حشو مركب A2', category: 'ترميم', unit: 'أنبوب', stock: 12, minStock: 6, expiry: '06/2027', supplier: '3M Dental', unitCost: 28 },
  { id: 'I004', name: 'مخدر موضعي Lidocaine', category: 'أدوية', unit: 'كارتريدج', stock: 2, minStock: 15, expiry: '03/2027', supplier: 'شركة الأدوية الأردنية', unitCost: 1.8 },
  { id: 'I005', name: 'أكواب ري فم', category: 'مستلزمات', unit: 'صندوق', stock: 20, minStock: 5, expiry: null, supplier: 'شركة الطب للتوريدات', unitCost: 2.2 },
  { id: 'I006', name: 'أقراص طحن', category: 'أدوات', unit: 'حبة', stock: 3, minStock: 10, expiry: null, supplier: 'Komet', unitCost: 8.5 },
  { id: 'I007', name: 'إبر تخدير', category: 'مستلزمات', unit: 'صندوق', stock: 6, minStock: 5, expiry: '09/2026', supplier: 'شركة الأدوية الأردنية', unitCost: 12 },
  { id: 'I008', name: 'مادة أثر سيليكون', category: 'مواد قالب', unit: 'طقم', stock: 4, minStock: 3, expiry: '01/2027', supplier: 'Kettenbach', unitCost: 55 },
];

// ===== REVENUE DATA (Monthly) =====
export const revenueData = [
  { month: 'أبريل 2025', revenue: 8200, target: 9000 },
  { month: 'مايو 2025', revenue: 9100, target: 9000 },
  { month: 'يونيو 2025', revenue: 7800, target: 9500 },
  { month: 'يوليو 2025', revenue: 10200, target: 9500 },
  { month: 'أغسطس 2025', revenue: 9600, target: 10000 },
  { month: 'سبتمبر 2025', revenue: 11300, target: 10000 },
  { month: 'أكتوبر 2025', revenue: 10800, target: 10500 },
  { month: 'نوفمبر 2025', revenue: 12100, target: 11000 },
  { month: 'ديسمبر 2025', revenue: 13400, target: 12000 },
  { month: 'يناير 2026', revenue: 11200, target: 12000 },
  { month: 'فبراير 2026', revenue: 12800, target: 12500 },
  { month: 'مارس 2026', revenue: 14200, target: 13000 },
];

// ===== APPOINTMENTS WEEKLY =====
export const appointmentsWeekly = [
  { day: 'السبت', booked: 14, completed: 12, cancelled: 2 },
  { day: 'الأحد', booked: 18, completed: 16, cancelled: 1 },
  { day: 'الاثنين', booked: 16, completed: 14, cancelled: 2 },
  { day: 'الثلاثاء', booked: 20, completed: 18, cancelled: 1 },
  { day: 'الأربعاء', booked: 15, completed: 13, cancelled: 2 },
  { day: 'الخميس', booked: 22, completed: 19, cancelled: 2 },
  { day: 'الجمعة', booked: 8, completed: 7, cancelled: 1 },
];

// ===== TREATMENT TYPES DISTRIBUTION =====
export const treatmentTypes = [
  { name: 'تقويم أسنان', value: 32, color: '#2563EB' },
  { name: 'حشوات', value: 22, color: '#06B6D4' },
  { name: 'تنظيف', value: 18, color: '#10B981' },
  { name: 'جراحة', value: 12, color: '#F59E0B' },
  { name: 'تجميل', value: 9, color: '#8B5CF6' },
  { name: 'أخرى', value: 7, color: '#64748B' },
];

// ===== PRESCRIPTIONS =====
export const prescriptions = [
  { id: 'RX001', patientId: 'P003', patient: 'محمد علي الزيادات', doctor: 'د. كريم الشريف', date: '20/03/2026', medications: [{ name: 'أموكسيسيلين 500mg', dosage: 'حبة كل 8 ساعات', duration: '7 أيام' }, { name: 'إيبوبروفين 400mg', dosage: 'حبة كل 8 ساعات عند الألم', duration: '5 أيام' }], notes: 'تجنب الأطعمة الصلبة لمدة 3 أيام' },
  { id: 'RX002', patientId: 'P001', patient: 'أحمد محمود الخالدي', doctor: 'د. صدام العتوم', date: '28/03/2026', medications: [{ name: 'باراسيتامول 500mg', dosage: 'حبة كل 6 ساعات', duration: '3 أيام' }], notes: 'ضع الواقي الليلي قبل النوم' },
];

// ===== NOTIFICATIONS =====
export const notifications = [
  { id: 'N001', type: 'appointment', title: 'موعد قريب', message: 'أحمد محمود الخالدي - تقويم أسنان - الساعة 9:00', time: '8 دقائق', read: false, priority: 'high' },
  { id: 'N002', type: 'payment', title: 'فاتورة متأخرة', message: 'محمد علي الزيادات - 160 JOD - متأخرة 10 أيام', time: '1 ساعة', read: false, priority: 'high' },
  { id: 'N003', type: 'inventory', title: 'نقص في المخزون', message: 'مخدر موضعي Lidocaine - متبقي 2 كارتريدج فقط', time: '2 ساعة', read: false, priority: 'medium' },
  { id: 'N004', type: 'whatsapp', title: 'تذكير واتساب مُرسَل', message: 'تم إرسال تذكير الموعد لسارة عبدالله العمري', time: '3 ساعات', read: true, priority: 'low' },
  { id: 'N005', type: 'appointment', title: 'موعد فائت', message: 'ريم أحمد المصري - لم تحضر للموعد', time: '5 ساعات', read: true, priority: 'medium' },
  { id: 'N006', type: 'system', title: 'نسخة احتياطية', message: 'تم إنشاء نسخة احتياطية تلقائية بنجاح', time: 'أمس', read: true, priority: 'low' },
];

export const branches = [
  { id: 'B001', name: 'الفرع الرئيسي - عمان', address: 'شارع المدينة المنورة، عمان', phone: '065001234', status: 'active' },
  { id: 'B002', name: 'فرع إربد', address: 'شارع الجامعة، إربد', phone: '025001234', status: 'active' },
  { id: 'B003', name: 'فرع الزرقاء', address: 'شارع الأمير حسن، الزرقاء', phone: '035001234', status: 'active' },
];
