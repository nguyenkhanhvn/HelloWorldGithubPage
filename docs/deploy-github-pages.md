# Hướng dẫn triển khai lên GitHub Pages

Tài liệu này hướng dẫn đưa website tĩnh trong repo này lên GitHub Pages.
Website không có backend, không có bước build, nên chỉ cần push code là chạy.

**Tóm tắt nhanh:** tạo repo → push code → Settings → Pages → chọn nhánh `main`,
thư mục `/ (root)` → đợi 1–2 phút → truy cập URL.

---

## 1. Chuẩn bị

Bạn cần:

- Một tài khoản GitHub.
- Git đã cài trên máy. Kiểm tra: `git --version`.
- Repo này ở dạng thư mục trên máy (thư mục chứa `index.html`).

Cấu hình Git lần đầu (nếu chưa làm):

```bash
git config --global user.name "Tên của bạn"
git config --global user.email "email@cua-ban.com"
```

---

## 2. Chọn kiểu site

GitHub Pages có hai kiểu, khác nhau ở URL và ở tên repo. Chọn một:

| | **Project site** (khuyến nghị) | **User site** |
|---|---|---|
| Tên repo | Bất kỳ, ví dụ `hello-world` | Bắt buộc `<username>.github.io` |
| URL | `https://<username>.github.io/hello-world/` | `https://<username>.github.io/` |
| Số lượng | Nhiều repo tùy ý | Mỗi tài khoản chỉ một |

Website này chạy được ở cả hai kiểu vì mọi đường dẫn tới CSS/JS/ảnh đều là
**đường dẫn tương đối** (`assets/css/style.css`, không phải `/assets/...`).
Đây là điểm hay hỏng nhất khi deploy project site — xem [mục 8](#8-xử-lý-sự-cố).

Phần dưới dùng ví dụ project site tên `hello-world`.

---

## 3. Tạo repository trên GitHub

1. Vào https://github.com/new
2. **Repository name**: `hello-world`
   (nếu làm user site thì đặt đúng `<username>.github.io`)
3. **Public** — GitHub Pages miễn phí chỉ hoạt động với repo public
   (repo private cần tài khoản GitHub Pro/Team/Enterprise)
4. **Không** tick "Add a README file" / `.gitignore` / license — repo này đã có sẵn
5. Bấm **Create repository**

Sau khi tạo, GitHub hiện URL của repo, dạng:
`https://github.com/<username>/hello-world.git` — copy lại để dùng ở bước sau.

---

## 4. Push code lên GitHub

Mở terminal tại thư mục chứa `index.html`:

```bash
# Khởi tạo repo Git
git init
git branch -M main

# Kiểm tra xem những file nào sẽ được commit
git status

# Thêm và commit
git add .
git commit -m "Initial commit: static Hello World site"

# Kết nối với repo trên GitHub (thay <username>)
git remote add origin https://github.com/<username>/hello-world.git

# Đẩy code lên
git push -u origin main
```

Nếu Git hỏi đăng nhập: GitHub **không** nhận mật khẩu tài khoản nữa. Dùng một
trong hai cách:

- **Personal Access Token**: tạo tại
  https://github.com/settings/tokens (loại *classic*, tick scope `repo`), rồi
  dán token vào ô password.
- **GitHub CLI**: cài [`gh`](https://cli.github.com/) rồi chạy `gh auth login`.

Kiểm tra: mở `https://github.com/<username>/hello-world`, phải thấy `index.html`,
`404.html`, thư mục `assets/`.

> **Lưu ý:** `.nojekyll` là file rỗng nên dễ bị bỏ sót. Kiểm tra bằng
> `git ls-files | grep nojekyll`. Nếu không thấy, chạy `git add -f .nojekyll`.

---

## 5. Bật GitHub Pages

1. Vào repo trên GitHub → tab **Settings** (thanh trên cùng, bên phải)
2. Menu trái, mục **Code and automation** → **Pages**
3. Phần **Build and deployment**:
   - **Source**: chọn `Deploy from a branch`
   - **Branch**: chọn `main`, thư mục `/ (root)`
4. Bấm **Save**

GitHub bắt đầu deploy. Theo dõi tiến độ ở tab **Actions** của repo
(job tên *pages build and deployment*). Thường mất 30 giây – 2 phút.

Xong, quay lại **Settings → Pages** sẽ thấy dòng:

> Your site is live at `https://<username>.github.io/hello-world/`

Mở URL đó.

---

## 6. Cập nhật website sau này

Sửa file trên máy rồi:

```bash
git add .
git commit -m "Update greeting list"
git push
```

GitHub Pages tự deploy lại sau mỗi lần push lên `main`. Không cần bấm gì thêm.

Nếu không thấy thay đổi ngay, đó gần như luôn là **cache trình duyệt**:
bấm `Ctrl + Shift + R` (hoặc `Cmd + Shift + R` trên Mac) để hard-refresh.
GitHub Pages đặt cache 10 phút cho các file tĩnh, nên trình duyệt của khách
truy cập có thể chậm hơn một chút.

---

## 7. Tùy chọn: dùng tên miền riêng

1. Ở nhà cung cấp tên miền, tạo bản ghi DNS:

   - **Tên miền con** (`www.example.com`): tạo bản ghi `CNAME`
     trỏ tới `<username>.github.io`
   - **Tên miền gốc** (`example.com`): tạo 4 bản ghi `A` trỏ tới
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`

2. Trên GitHub: **Settings → Pages → Custom domain**, nhập tên miền, bấm **Save**.
   GitHub tự tạo file `CNAME` trong repo — nhớ `git pull` về máy sau đó.

3. Đợi DNS lan truyền (vài phút đến vài giờ), rồi tick **Enforce HTTPS**.

Với tên miền riêng, website chạy ở gốc domain, nên đường dẫn tuyệt đối cũng sẽ
hoạt động — nhưng cứ giữ đường dẫn tương đối để còn test được ở local.

---

## 8. Xử lý sự cố

### Trang trắng, hoặc hiện chữ nhưng mất hết CSS

Nguyên nhân phổ biến nhất khi dùng **project site**: đường dẫn tuyệt đối.

Trên `https://<username>.github.io/hello-world/`, đường dẫn `/assets/css/style.css`
trỏ tới `https://<username>.github.io/assets/css/style.css` — **thiếu tên repo**
nên trả về 404.

Cách sửa: dùng đường dẫn tương đối. Repo này đã làm đúng:

```html
<!-- Đúng -->
<link rel="stylesheet" href="assets/css/style.css" />

<!-- Sai với project site -->
<link rel="stylesheet" href="/assets/css/style.css" />
```

Mở DevTools (`F12`) → tab **Network**, tìm dòng nào màu đỏ / status 404 để biết
file nào hỏng đường dẫn.

### Lỗi 404 ở chính trang chủ

- File có tên đúng `index.html` (viết thường) và nằm ở **gốc repo** chưa?
- Trong **Settings → Pages**, có chọn đúng branch `main` và folder `/ (root)`?
- Repo có phải **Public**?
- Deploy đã chạy xong chưa? Xem tab **Actions**.
- URL có dấu `/` ở cuối chưa? `.../hello-world` và `.../hello-world/` đôi khi
  hành xử khác nhau.

### File hoặc thư mục bắt đầu bằng dấu gạch dưới bị bỏ qua

Mặc định GitHub Pages chạy Jekyll, và Jekyll bỏ qua mọi file/thư mục bắt đầu
bằng `_`. File `.nojekyll` ở gốc repo tắt hành vi này. Repo đã có sẵn file đó —
chỉ cần chắc chắn nó đã được commit (xem lưu ý ở [mục 4](#4-push-code-lên-github)).

### Deploy thành công nhưng vẫn thấy nội dung cũ

- Hard-refresh: `Ctrl + Shift + R`
- Thử chế độ ẩn danh, hoặc trình duyệt khác
- Kiểm tra commit mới nhất đã lên GitHub chưa: `git log origin/main -1`

### Trang 404 tùy chỉnh không hiện

GitHub Pages chỉ dùng `404.html` khi truy cập qua đúng domain của Pages, và chỉ
sau khi deploy xong. Nó **không** hoạt động khi mở file bằng `file://`.

### Không push được: `remote: Permission denied`

Sai thông tin đăng nhập. Dùng Personal Access Token thay cho mật khẩu, hoặc
chạy `gh auth login`. Trên Windows, có thể phải xóa thông tin cũ trong
*Credential Manager* → *Windows Credentials* → mục `git:https://github.com`.

---

## 9. Tùy chọn: deploy bằng GitHub Actions

Cách ở [mục 5](#5-bật-github-pages) là đủ cho site tĩnh này. Nếu sau này bạn
thêm bước build, hoặc muốn kiểm soát quy trình deploy, chuyển sang GitHub Actions:

1. Tạo file `.github/workflows/deploy.yml` với nội dung dưới đây
2. **Settings → Pages → Source**: đổi sang `GitHub Actions`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

# Chỉ chạy một lượt deploy tại một thời điểm.
concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/configure-pages@v5

      # Site không cần build: upload thẳng thư mục gốc.
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .

      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## 10. Kiểm tra trước khi deploy (khuyến nghị)

Chạy local để chắc chắn mọi thứ ổn trước khi push:

```bash
cd tests
npm install
node serve.js          # http://127.0.0.1:8765/
```

Ở terminal khác:

```bash
cd tests
node dom.test.js       # cấu trúc HTML + hành vi JavaScript
node browser.test.js   # layout responsive, tương tác, chụp screenshot
node contrast.test.js  # kiểm tra tương phản màu (WCAG AA)
```

Thư mục `tests/` chỉ phục vụ việc kiểm thử. Nó vẫn được GitHub Pages phục vụ như
file tĩnh nhưng vô hại. Nếu muốn loại hẳn khỏi bản deploy, dùng cách ở
[mục 9](#9-tùy-chọn-deploy-bằng-github-actions) và chỉ upload các file cần thiết.

---

## Tham khảo

- [Tài liệu chính thức GitHub Pages](https://docs.github.com/en/pages)
- [Giới hạn của GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#limits-on-use-of-github-pages)
  (repo ≤ 1 GB, băng thông 100 GB/tháng, 10 lượt build/giờ)
- [Cấu hình tên miền riêng](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
