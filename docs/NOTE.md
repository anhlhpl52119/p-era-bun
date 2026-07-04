# Notes

## Mở devtools

- Hiện tại phiên bản Electrobun `1.18.1` DevTools native WKWebview bị dock vào cửa sổ,
- WebKit có thể làm webview host bị orphaned: DOM/WebContent vẫn chạy nhưng phần hiển thị trắng.

SOLUTION: chuyển DevTools từ `Docked` sang `Separate Window`, rồi đóng-mở lại Inspector. Đừng dùng dạng docked.

Upstream issue: https://github.com/blackboardsh/electrobun/issues/357

- Patch đề xuất detach Inspector trước khi show, nhưng PR đã đóng/chưa merge:
  https://github.com/blackboardsh/electrobun/pull/398
