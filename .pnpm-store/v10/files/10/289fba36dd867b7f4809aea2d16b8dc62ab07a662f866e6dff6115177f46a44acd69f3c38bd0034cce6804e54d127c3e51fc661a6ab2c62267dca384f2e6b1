// SPDX-License-Identifier: MIT

#pragma once

#include "lib/native/base/base.hh"
#include "ffi.hh"

#include <napi.h>

extern "C" {

// The uv headers are not included in node-api-headers, but we only use a few
// uv types and functions, so just declare them here.

struct uv_loop_s;
struct uv_handle_s;

struct uv_poll_s {
    void *data;
    // Kinda opaque struct, use uv_handle_size() to allocate enough memory
};

typedef struct uv_loop_s uv_loop_t;
typedef struct uv_handle_s uv_handle_t;
typedef struct uv_poll_s uv_poll_t;

typedef enum {
    UV_UNKNOWN_HANDLE = 0,
    UV_ASYNC,
    UV_CHECK,
    UV_FS_EVENT,
    UV_FS_POLL,
    UV_HANDLE,
    UV_IDLE,
    UV_NAMED_PIPE,
    UV_POLL,
    UV_PREPARE,
    UV_PROCESS,
    UV_STREAM,
    UV_TCP,
    UV_TIMER,
    UV_TTY,
    UV_UDP,
    UV_SIGNAL,
    UV_FILE,
    UV_HANDLE_TYPE_MAX
} uv_handle_type;

typedef void (*uv_close_cb)(uv_handle_t *handle);
typedef void (*uv_poll_cb)(uv_poll_t *handle, int status, int events);

enum uv_poll_event {
    UV_READABLE = 1,
    UV_WRITABLE = 2,
    UV_DISCONNECT = 4,
    UV_PRIORITIZED = 8
};

#if defined(_WIN32)
    typedef uintptr_t uv_os_sock_t; // SOCKET
    #define IMPORT __declspec(dllimport)
#else
    typedef int uv_os_sock_t;
    #define IMPORT
#endif

IMPORT void uv_ref(uv_handle_t *handle);
IMPORT void uv_unref(uv_handle_t *handle);
IMPORT void uv_close(uv_handle_t *handle, uv_close_cb close_cb);
IMPORT size_t uv_handle_size(uv_handle_type type);

IMPORT int uv_poll_init(uv_loop_t *loop, uv_poll_t *handle, int fd);
IMPORT int uv_poll_init_socket(uv_loop_t *loop, uv_poll_t *handle, uv_os_sock_t socket);
IMPORT int uv_poll_start(uv_poll_t *handle, int events, uv_poll_cb cb);
IMPORT int uv_poll_stop(uv_poll_t *handle);

IMPORT const char *uv_strerror(int err);

#undef IMPORT

};

namespace K {

class PollHandle: public Napi::ObjectWrap<PollHandle> {
    Napi::Env env = nullptr;

    uv_poll_t *handle = nullptr;
    Napi::FunctionReference callback;

public:
    static Napi::Function InitClass(InstanceData *instance);

    PollHandle(const Napi::CallbackInfo &info);

    void Finalize(Napi::BasicEnv env) override;

    void Start(const Napi::CallbackInfo &info);
    void Stop(const Napi::CallbackInfo &info);
    void Close(const Napi::CallbackInfo &info);
    void Ref(const Napi::CallbackInfo &info);
    void Unref(const Napi::CallbackInfo &info);

private:
    void Close();

    static void OnPoll(uv_poll_t *handle, int status, int events);
};

Napi::Value Poll(const Napi::CallbackInfo &info);

}
