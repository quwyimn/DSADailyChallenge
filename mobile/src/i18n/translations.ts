// Vietnamese translation dictionary.
// Every user-visible string in the app must have an entry here.
// Looked up via useLanguageStore().t(key) — see languageStore.ts.
//
// Strings with a `{placeholder}` are filled in by the caller via
// `.replace('{placeholder}', value)` — there is no templating engine here,
// this is intentionally the simplest thing that works.

export const vi = {
  // ── AUTH ────────────────────────────────────────────────────────────
  'auth.login.title': 'Đăng nhập',
  'auth.login.email': 'Email',
  'auth.login.password': 'Mật khẩu',
  'auth.login.button': 'Đăng nhập',
  'auth.login.loading': 'Đang đăng nhập…',
  'auth.login.noAccount': 'Chưa có tài khoản? Đăng ký',
  'auth.register.title': 'Đăng ký',
  'auth.register.name': 'Họ và tên',
  'auth.register.class': 'Chọn lớp',
  'auth.register.passwordHint': 'Mật khẩu (tối thiểu 8 ký tự)',
  'auth.register.loading': 'Đang tạo tài khoản…',
  'auth.register.button': 'Đăng ký',
  'auth.register.haveAccount': 'Đã có tài khoản? Đăng nhập',

  // ── HOME ────────────────────────────────────────────────────────────
  'home.greeting': 'Xin chào, {name}',
  'home.todayProgress': 'Hôm nay: {done}/{total} câu',
  'home.activityHistory': 'Hoạt động 7 ngày',
  'home.latestBadge': 'Huy hiệu mới nhất',
  'home.start': 'Bắt đầu',
  'home.continue': 'Tiếp tục',
  'home.review': 'Xem lại',
  'home.todaysChallenges': 'Thử thách hôm nay',
  'home.loadingTasks': 'Đang tải thử thách hôm nay…',
  'home.noTasks': 'Không có thử thách hôm nay.',
  'home.challenges': 'thử thách',
  'home.done': '✓ Hoàn thành',
  'home.completed': 'hoàn thành',
  'home.leaderboard': 'Bảng xếp hạng',
  'home.profile': 'Hồ sơ',
  'home.logout': 'Đăng xuất',
  'home.streakDays': 'ngày',
  'home.pointsToday': 'điểm hôm nay',

  // ── SUBJECT SCREEN ──────────────────────────────────────────────────
  'subject.question': 'Câu',
  'subject.noAttemptsLeft': 'Hết lượt hôm nay',
  'subject.difficulty.easy': 'Dễ',
  'subject.difficulty.medium': 'Trung bình',
  'subject.difficulty.hard': 'Khó',

  // ── CHALLENGE / SUBMISSION ──────────────────────────────────────────
  'challenge.submit': 'Nộp bài',
  'challenge.tryAgain': 'Thử lại',
  'challenge.correct': 'Chính xác!',
  'challenge.incorrect': 'Sai rồi',
  'challenge.points': 'điểm',
  'challenge.attemptsLeft': 'lượt còn lại hôm nay',
  'challenge.noAttemptsLeft': 'Hết lượt hôm nay. Điểm cao nhất đã được ghi.',
  'challenge.practiceAttempt': 'Lượt luyện tập — điểm đã được ghi hôm nay.',
  'challenge.allStepsDone': 'Đã dự đoán xong — sẵn sàng nộp bài.',
  'challenge.attempt': 'Lượt',
  'challenge.best': 'tốt nhất',
  'challenge.notFound': 'Không tìm thấy bài tập.',
  'challenge.actionsRecorded': 'hành động đã ghi nhận',
  'challenge.todaysAttempts': 'Lượt thử hôm nay',

  // ── BUBBLE SORT VIEW ────────────────────────────────────────────────
  'bubbleSort.title': 'Bubble Sort',
  'bubbleSort.step': 'Bước',
  'bubbleSort.of': 'của',
  'bubbleSort.comparing': 'So sánh vị trí',
  'bubbleSort.and': 'và',
  'bubbleSort.swap': 'Đổi chỗ',
  'bubbleSort.noSwap': 'Giữ nguyên',

  // ── STACK OPS VIEW ──────────────────────────────────────────────────
  'stackOps.title': 'Stack Operations',
  'stackOps.step': 'Bước',
  'stackOps.currentOp': 'Thao tác hiện tại',
  'stackOps.beforeOp': 'Stack trước thao tác',
  'stackOps.predictStack': 'Dự đoán stack sau thao tác:',
  'stackOps.next': 'Tiếp →',
  'stackOps.emptyStack': '(Stack rỗng)',
  'stackOps.bottom': 'đáy',
  'stackOps.top': 'đỉnh',
  'stackOps.bottomToTop': 'từ đáy (trái) → đỉnh (phải)',

  // ── QUEUE OPS VIEW ──────────────────────────────────────────────────
  'queueOps.title': 'Queue (Hàng đợi)',
  'queueOps.step': 'Bước',
  'queueOps.enqueue': 'ENQUEUE',
  'queueOps.dequeue': 'DEQUEUE',
  'queueOps.front': 'Front',
  'queueOps.back': 'Back',
  'queueOps.predictPrompt': 'Dự đoán hàng đợi sau thao tác:',
  'queueOps.confirm': 'Xác nhận',
  'queueOps.emptyQueue': '(trống)',
  'queueOps.invalidInput': 'Vui lòng nhập số hợp lệ cho tất cả ô.',

  // ── BINARY SEARCH VIEW ──────────────────────────────────────────────
  'binarySearch.title': 'Binary Search',
  'binarySearch.target': 'Mục tiêu',
  'binarySearch.tapInstruction': 'Chọn chỉ số mid theo thứ tự binary search sẽ kiểm tra',
  'binarySearch.step': 'Bước',
  'binarySearch.index': 'Chỉ số',
  'binarySearch.clear': 'Xóa',
  'binarySearch.correctSequence': 'Thứ tự đúng:',

  // ── LINKED LIST VIEW ────────────────────────────────────────────────
  'linkedList.title': 'Linked List',
  'linkedList.initialList': 'Danh sách ban đầu',
  'linkedList.predictResult': 'Dự đoán kết quả',
  'linkedList.moveUp': '↑',
  'linkedList.moveDown': '↓',
  'linkedList.newNode': 'Node mới cần chèn:',
  'linkedList.emptyList': '(danh sách trống)',
  'linkedList.reverseBtn': 'Đảo ngược',
  'linkedList.confirmDelete': 'Xác nhận xóa',
  'linkedList.confirmInsert': 'Xác nhận chèn',
  'linkedList.correctAnswer': 'Đáp án đúng:',
  'linkedList.operation.delete_head': 'Xóa node đầu tiên',
  'linkedList.operation.delete_tail': 'Xóa node cuối cùng',
  'linkedList.operation.delete_at': 'Xóa node tại vị trí',
  'linkedList.operation.delete_middle': 'Xóa node ở giữa',
  'linkedList.operation.insert_head': 'Chèn node vào đầu',
  'linkedList.operation.insert_tail': 'Chèn node vào cuối',
  'linkedList.operation.insert_at': 'Chèn node tại vị trí',
  'linkedList.operation.reverse': 'Đảo ngược danh sách',

  // ── LEARN TAB ───────────────────────────────────────────────────────
  'learn.title': 'Minh họa thuật toán',
  'learn.subtitle': 'Chọn thuật toán để xem minh họa',
  'learn.bubbleSort.desc': 'Sắp xếp bằng cách so sánh và đổi chỗ liên tiếp',
  'learn.linkedList.desc': 'Cấu trúc danh sách liên kết các node',
  'learn.binarySearch.desc': 'Tìm kiếm nhị phân trên mảng đã sắp xếp',
  'learn.stackOps.desc': 'Ngăn xếp LIFO — vào sau ra trước',
  'learn.queueOps.desc': 'Hàng đợi FIFO — vào trước ra trước',

  // ── LEARN DETAIL — SHARED ───────────────────────────────────────────
  'learn.concept': 'Khái niệm',
  'learn.howItWorks': 'Cách hoạt động',
  'learn.interactiveDemo': 'Demo tương tác',
  'learn.complexity': 'Độ phức tạp',
  'learn.prev': '◀ Trước',
  'learn.next': 'Tiếp ▶',
  'learn.step': 'Bước',
  'learn.sortComplete': '✅ Sắp xếp hoàn tất!',
  'learn.found': '✅ Tìm thấy!',
  'learn.notFound': '❌ Không tìm thấy',
  'learn.searchFor': 'Tìm kiếm',
  'learn.time': 'Thời gian',
  'learn.space': 'Không gian',
  'learn.best': 'Tốt nhất',
  'learn.average': 'Trung bình',
  'learn.worst': 'Xấu nhất',

  // ── BUBBLE SORT LEARN ───────────────────────────────────────────────
  'learn.bubbleSort.title': 'Bubble Sort — Sắp xếp nổi bọt',
  'learn.bubbleSort.explanation':
    'Bubble Sort so sánh từng cặp phần tử liền kề và đổi chỗ nếu chúng sai thứ tự. Phần tử lớn nhất nổi về cuối sau mỗi lượt duyệt.',
  'learn.bubbleSort.step1': 'Bắt đầu từ phần tử đầu tiên.',
  'learn.bubbleSort.step2': 'So sánh phần tử hiện tại với phần tử kế tiếp.',
  'learn.bubbleSort.step3': 'Nếu phần tử hiện tại > kế tiếp → đổi chỗ (swap).',
  'learn.bubbleSort.step4': 'Di chuyển sang cặp tiếp theo.',
  'learn.bubbleSort.step5': 'Sau mỗi lượt, phần tử lớn nhất về đúng vị trí.',
  'learn.bubbleSort.step6': 'Lặp lại cho đến khi không còn swap nào.',
  'learn.bubbleSort.comparing': 'So sánh vị trí',
  'learn.bubbleSort.swap': 'SWAP ✓',
  'learn.bubbleSort.noSwap': 'Giữ nguyên',

  // ── LINKED LIST LEARN ───────────────────────────────────────────────
  'learn.linkedList.title': 'Linked List — Danh sách liên kết',
  'learn.linkedList.explanation':
    'Linked List gồm các node, mỗi node chứa giá trị và con trỏ đến node tiếp theo. Các node không cần liên tiếp trong bộ nhớ.',
  'learn.linkedList.step1': 'Mỗi node gồm: [Giá trị | Con trỏ →].',
  'learn.linkedList.step2': 'Node đầu gọi là Head, node cuối có con trỏ = null.',
  'learn.linkedList.step3': 'Để duyệt list: bắt đầu từ Head, theo con trỏ đến cuối.',
  'learn.linkedList.step4': 'Chèn/xóa: chỉ cần thay đổi con trỏ, không cần dịch chuyển.',
  'learn.linkedList.step5': 'Truy cập ngẫu nhiên: O(n) — phải duyệt từ đầu.',
  'learn.linkedList.footnote': '* sau khi đã xác định được vị trí',

  // ── LINKED LIST LEARN — INTERACTIVE DEMO STEPS ─────────────────────
  'learn.linkedList.demo.step1.titleSuffix': 'Danh sách ban đầu',
  'learn.linkedList.demo.step1.text': 'Danh sách gồm 5 node. Ta cần xóa node tại vị trí 2 (giá trị 30).',
  'learn.linkedList.demo.step2.titleSuffix': 'Duyệt đến node trước vị trí cần xóa',
  'learn.linkedList.demo.step2.text': 'Di chuyển đến node tại index 1 (node trước node cần xóa).',
  'learn.linkedList.demo.step3.titleSuffix': 'Xác định node cần xóa',
  'learn.linkedList.demo.step3.text': 'Node cần xóa: [30] tại index 2. Node trước: [20].',
  'learn.linkedList.demo.step4.titleSuffix': 'Thay đổi con trỏ',
  'learn.linkedList.demo.step4.text': 'prev.next = node.next → [20] trỏ thẳng đến [40], bỏ qua [30].',
  'learn.linkedList.demo.step5.titleSuffix': 'Kết quả',
  'learn.linkedList.demo.step5.text': '✅ Xóa thành công! Node [30] đã bị loại khỏi danh sách.',
  'learn.linkedList.demo.bypassLabel': 'Con trỏ mới (prev.next):',

  // ── BINARY SEARCH LEARN ─────────────────────────────────────────────
  'learn.binarySearch.title': 'Binary Search — Tìm kiếm nhị phân',
  'learn.binarySearch.explanation':
    'Binary Search tìm kiếm trong mảng đã sắp xếp bằng cách chia đôi vùng tìm kiếm mỗi bước, loại bỏ một nửa phần tử còn lại.',
  'learn.binarySearch.step1': 'Yêu cầu: mảng phải được sắp xếp trước.',
  'learn.binarySearch.step2': 'Đặt low = 0, high = n-1.',
  'learn.binarySearch.step3': 'Tính mid = floor((low + high) / 2).',
  'learn.binarySearch.step4': 'Nếu arr[mid] == target → tìm thấy!',
  'learn.binarySearch.step5': 'Nếu arr[mid] < target → low = mid + 1.',
  'learn.binarySearch.step6': 'Nếu arr[mid] > target → high = mid - 1.',
  'learn.binarySearch.step7': 'Lặp lại đến khi tìm thấy hoặc low > high.',
  'learn.binarySearch.toggleFound': 'Tìm 23 (có)',
  'learn.binarySearch.toggleNotFound': 'Tìm 50 (không có)',
  'learn.binarySearch.eliminateLeft': 'loại nửa trái',
  'learn.binarySearch.eliminateRight': 'loại nửa phải',
  'learn.binarySearch.foundMessage': '✅ Tìm thấy {value} tại chỉ số {index}!',
  'learn.binarySearch.notFoundMessage': '❌ Không tìm thấy {value} trong mảng.',

  // ── STACK OPS LEARN ─────────────────────────────────────────────────
  'learn.stackOps.conceptTitle': 'Stack — Ngăn xếp (LIFO)',
  'learn.stackOps.explanation':
    'Stack là cấu trúc dữ liệu hoạt động theo nguyên tắc LIFO (Last In First Out) — phần tử vào sau sẽ ra trước. Giống như chồng đĩa, bạn chỉ có thể lấy đĩa trên cùng.',
  'learn.stackOps.step1': 'PUSH: Thêm phần tử vào đỉnh stack — thao tác O(1).',
  'learn.stackOps.step2': 'POP: Lấy và xóa phần tử ở đỉnh stack — thao tác O(1).',
  'learn.stackOps.step3': 'PEEK: Xem phần tử đỉnh mà không xóa — thao tác O(1).',
  'learn.stackOps.step4': 'Kiểm tra rỗng: Stack rỗng khi không còn phần tử nào.',
  'learn.stackOps.step5': 'LIFO: Last In First Out — phần tử được push vào sau cùng sẽ được pop ra đầu tiên.',

  // ── QUEUE OPS LEARN ─────────────────────────────────────────────────
  'learn.queueOps.conceptTitle': 'Queue — Hàng đợi (FIFO)',
  'learn.queueOps.explanation':
    'Queue là cấu trúc dữ liệu hoạt động theo nguyên tắc FIFO (First In First Out) — phần tử vào trước sẽ ra trước. Giống như hàng chờ, người đến trước được phục vụ trước.',
  'learn.queueOps.step1': 'ENQUEUE: Thêm phần tử vào cuối hàng đợi (Back) — thao tác O(1).',
  'learn.queueOps.step2': 'DEQUEUE: Lấy và xóa phần tử ở đầu hàng đợi (Front) — thao tác O(1).',
  'learn.queueOps.step3': 'FRONT: Xem phần tử đầu tiên mà không xóa — thao tác O(1).',
  'learn.queueOps.step4': 'Kiểm tra rỗng: Hàng đợi rỗng khi không còn phần tử nào.',
  'learn.queueOps.step5': 'FIFO: First In First Out — phần tử được enqueue vào trước sẽ được dequeue ra trước.',

  // ── LEADERBOARD ─────────────────────────────────────────────────────
  'leaderboard.title': 'Bảng xếp hạng tuần',
  'leaderboard.rank': 'Hạng',
  'leaderboard.name': 'Tên',
  'leaderboard.points': 'Điểm',
  'leaderboard.you': '(bạn)',
  'leaderboard.empty': 'Chưa có dữ liệu tuần này.',
  'leaderboard.yourRank': 'Bạn đang xếp hạng #{rank} tuần này',

  // ── PROFILE ─────────────────────────────────────────────────────────
  'profile.title': 'Hồ sơ',
  'profile.streak': 'Chuỗi ngày',
  'profile.longestStreak': 'Dài nhất',
  'profile.days': 'ngày',
  'profile.badges': 'Huy hiệu',
  'profile.noBadges': 'Chưa có huy hiệu nào.',
  'profile.logout': 'Đăng xuất',
  'profile.loadError': 'Không thể tải dữ liệu hồ sơ. Nhấn để thử lại.',
  'profile.sheet.viewDetail': 'Xem chi tiết →',
  'profile.sheet.viewRanking': 'Xem bảng xếp hạng',
  'profile.sheet.streak': 'Chuỗi ngày',
  'profile.sheet.badges': 'Huy hiệu',
  'profile.sheet.logout': 'Đăng xuất',

  // ── COMMON ──────────────────────────────────────────────────────────
  'common.loading': 'Đang tải…',
  'common.error': 'Có lỗi xảy ra',
  'common.errorDetail': 'Ứng dụng gặp lỗi không mong muốn. Hãy khởi động lại — tiến trình hôm nay của bạn đã được lưu.',
  'common.restart': 'Khởi động lại',
  'common.retry': 'Thử lại',
  'common.dismiss': 'Đóng',
  'common.restoring': 'Đang khôi phục phiên…',
  'common.networkError': 'Lỗi mạng',

  // ── TAB LABELS ──────────────────────────────────────────────────────
  'tab.challenges': 'Bài tập',
  'tab.learn': 'Minh họa',

  // ── WELCOME OVERLAY ──────────────────────────────────────────────────
  'welcome.greeting': 'Chào mừng,',
  'welcome.subtitle': 'Sẵn sàng chinh phục DSA hôm nay chưa?',
  'welcome.streak': 'ngày streak — tiếp tục nào!',
};

export type TranslationKey = keyof typeof vi;
