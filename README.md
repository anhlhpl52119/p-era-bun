# Electrobun PROCESS

## `BrowserView` and `Electroview`

```text
┌─────────────────────────────────────────────────────┐
│                        APP.                         │
│                                                     │
│  Bun / Main Process              WebView / Vue      │
│                                                     │
│  ┌──────────────────┐          ┌─────────────────┐  │
│  │   BrowserView    │◄── RPC ─►│   Electroview   │  │
│  │                  │          │                 │  │
│  │ electrobun/bun   │          │ electrobun/view │  │
│  └──────────────────┘          └─────────────────┘  │
│          │                            │             │
│          ▼                            ▼             │
│    Native / Bun API                Vue UI           │
│    fetch()                         button           │
│    filesystem                      input            │
│    database                        render           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## RPC Concept

Trong defineRPC của `Electrobun`, khác biệt cốt lõi là:

> `request` = hỏi và chờ câu trả lời. (cần kết quả trả về)
>
> `message` = gửi thông báo và không chờ kết quả. (fire-and-forget)

Với app `Vue` + `Electrobun` có thể hình dung:

**REQUEST**

Use case cụ thể:

> User click button → Bun gọi REST API → Vue cần JSON để hiển thị.
>
> _"Hey server, làm việc này và CHO TÔI KẾT QUẢ."_"

```text
Vue                         Bun
 │                           │
 │──── getUser({id: 1}) ────>│
 │                           │ fetch API
 │                           │ await...
 │<────── User data ─────────│
 │
 ▼
render user
```

**MESSAGE**

Use case cụ thể:

> Vue gửi analytics/log về lưu vào db
>
> _"Hey, TÔI BÁO CHO BẠN BIẾT việc này vừa xảy ra."_"

```text
Vue                         Bun
 │                           │
 │──── log("button click") ──>│
 │                           │ ghi log
 │                           │
 │  không chờ response       │
 ▼                           ▼
tiếp tục                    xử lý
```
