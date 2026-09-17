// SPDX-License-Identifier: MIT

#include "lib/native/base/base.hh"
#include "type.hh"
#include "util.hh"
#include "uv.hh"

#include <napi.h>

namespace K {

Napi::Function PollHandle::InitClass(InstanceData *instance)
{
    Napi::Env env = instance->env;

    // node-addon-api wants std::vector
    std::vector<Napi::ClassPropertyDescriptor<PollHandle>> properties = {
        InstanceMethod("start", &PollHandle::Start, napi_default, instance),
        InstanceMethod("stop", &PollHandle::Stop, napi_default, instance),
        InstanceMethod("close", &PollHandle::Close, napi_default, instance),
        InstanceMethod("unref", &PollHandle::Unref, napi_default, instance),
        InstanceMethod("ref", &PollHandle::Ref, napi_default, instance)
    };

    if (Napi::Value dispose = env.RunScript("Symbol.dispose"); !IsNullOrUndefined(env, dispose)) {
        Napi::ClassPropertyDescriptor<PollHandle> prop = InstanceMethod(dispose.As<Napi::Symbol>(), &PollHandle::Close);
        properties.push_back(prop);
    }

    Napi::Function constructor = DefineClass(env, "PollHandle", properties, instance);
    return constructor;
}

PollHandle::PollHandle(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<PollHandle>(info), env(info.Env())
{
    if (info.Length() < 1 || !info[0].IsExternal()) {
        ThrowError<Napi::Error>(env, "Poll handles cannot be constructed manually");
        return;
    }

    Napi::External<void> external = info[0].As<Napi::External<void>>();
    int fd = (int)(intptr_t)external.Data();

    uv_loop_t *loop = nullptr;
    if (napi_get_uv_event_loop(env, &loop) != napi_ok || !loop) {
        ThrowError<Napi::Error>(env, "napi_get_uv_event_loop() failed");
        return;
    }

    // We would store it inside the class, but the definition of uv_poll_t involves windows.h...
    // and we won't want that on Windows. Heap allocation it is!
    // Also, it may have to outlive the object, because uv_close() is asynchronous.
    {
        size_t size = uv_handle_size(UV_POLL);

        handle = (uv_poll_t *)AllocateRaw(nullptr, size);
        MemSet(handle, 0, size);
    }

    if (int ret = uv_poll_init_socket(loop, handle, (uv_os_sock_t)fd); ret != 0) {
        ThrowError<Napi::Error>(env, "Failed to init UV poll: %1", uv_strerror(ret));
        return;
    }

    handle->data = this;
}

void PollHandle::Start(const Napi::CallbackInfo &info)
{
    InstanceData *instance = (InstanceData *)info.Data();

    bool has_opts = (info.Length() >= 2 && info[0].IsObject());

    if (info.Length() < 1u + has_opts) {
        ThrowError<Napi::TypeError>(env, "Expected 1 to 2 arguments, got %1", info.Length());
        return;
    }
    if (!info[0u + has_opts].IsFunction()) {
        ThrowError<Napi::TypeError>(env, "Unexpected %1 value for callback, expected function", GetValueType(instance, info[0u + has_opts]));
        return;
    }

    int events = 0;
    Napi::Function cb = info[0 + has_opts].As<Napi::Function>();

    if (has_opts) {
        Napi::Object opts = has_opts ? info[0].As<Napi::Object>() : Napi::Object::New(env);

        events |= opts.Get("readable").ToBoolean() ? UV_READABLE : 0;
        events |= opts.Get("writable").ToBoolean() ? UV_WRITABLE : 0;
        events |= opts.Get("disconnect").ToBoolean() ? UV_DISCONNECT : 0;
    } else {
        events = UV_READABLE;
    }

    callback = Napi::Persistent(cb);

    if (int ret = uv_poll_start(handle, events, &PollHandle::OnPoll); ret != 0) {
        callback.Reset();
        ThrowError<Napi::Error>(env, "Failed to start UV poll: %1", uv_strerror(ret));
    }
}

void PollHandle::Finalize(Napi::BasicEnv env)
{
    node_api_delete_reference(env, *this);
    SuppressDestruct();

    Close();
}

void PollHandle::Stop(const Napi::CallbackInfo &)
{
    uv_poll_stop(handle);
}

void PollHandle::Close(const Napi::CallbackInfo &)
{
    Close();
}

void PollHandle::Ref(const Napi::CallbackInfo &)
{
    uv_ref((uv_handle_t *)handle);
}

void PollHandle::Unref(const Napi::CallbackInfo &)
{
    uv_unref((uv_handle_t *)handle);
}

void PollHandle::Close()
{
    if (!handle)
        return;

    const auto release = [](uv_handle_t *ptr) {
        uv_poll_t *handle = (uv_poll_t *)ptr;
        ReleaseRaw(nullptr, handle, -1);
    };

    uv_poll_stop(handle);
    uv_close((uv_handle_t *)handle, release);

    callback.Reset();

    handle = nullptr;
}

void PollHandle::OnPoll(uv_poll_t *h, int status, int events)
{
    PollHandle *poll = (PollHandle *)h->data;

    if (poll->callback.IsEmpty()) [[unlikely]]
        return;

    Napi::Env env = poll->env;
    Napi::HandleScope scope(env);

    Napi::Object obj = Napi::Object::New(env);

    obj.Set("readable", !!(events & UV_READABLE));
    obj.Set("writable", !!(events & UV_WRITABLE));
    obj.Set("disconnect", !!(events & UV_DISCONNECT));

    napi_value args[] = { NewInt(env, (int32_t)status), obj };
    poll->callback.Call(poll->Value(), K_LEN(args), args);
}

Napi::Value Poll(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    InstanceData *instance = (InstanceData *)info.Data();

    bool has_opts = (info.Length() >= 3 && info[1].IsObject());

    if (info.Length() < 2u + has_opts) {
        ThrowError<Napi::TypeError>(env, "Expected 2 to 3 arguments, got %1", info.Length());
        return env.Null();
    }

    if (!info[0].IsNumber()) {
        ThrowError<Napi::TypeError>(env, "Unexpected %1 value for descriptor, expected number", GetValueType(instance, info[0]));
        return env.Null();
    }
    if (!info[1 + has_opts].IsFunction()) {
        ThrowError<Napi::TypeError>(env, "Unexpected %1 value for callback, expected function", GetValueType(instance, info[1 + has_opts]));
        return env.Null();
    }

    int fd = info[0].As<Napi::Number>().Int32Value();

    Napi::External<void> external = Napi::External<void>::New(env, (void *)(intptr_t)fd);
    Napi::Object inst = instance->construct_poll.New({ external });
    Napi::Function start = inst.Get("start").As<Napi::Function>();

    if (env.IsExceptionPending()) [[unlikely]]
        return env.Null();

    if (has_opts) {
        Napi::Value opts = info[1];
        Napi::Function cb = info[2].As<Napi::Function>();

        start.Call(inst, { opts, cb });
    } else {
        Napi::Function cb = info[1].As<Napi::Function>();
        start.Call(inst, { cb });
    }

    return inst;
}

}
