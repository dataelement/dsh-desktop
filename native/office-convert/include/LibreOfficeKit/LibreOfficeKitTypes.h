/* -*- Mode: C; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/*
 * This file is part of the LibreOffice project.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#ifndef INCLUDED_LIBREOFFICEKIT_LIBREOFFICEKIT_TYPES_H
#define INCLUDED_LIBREOFFICEKIT_LIBREOFFICEKIT_TYPES_H

#ifdef __cplusplus
extern "C" {
#endif

/** @see lok::Office::registerCallback().
    @since LibreOffice 6.0
 */
typedef void (*LibreOfficeKitCallback)(int nType, const char* pPayload, void* pData);

/** @see lok::Office::runLoop().
    @since LibreOffice 6.3
 */
typedef int (*LibreOfficeKitPollCallback)(void* pData, int timeoutUs);
typedef void (*LibreOfficeKitWakeCallback)(void* pData);

/// @see lok::Office::registerAnyInputCallback()
typedef bool (*LibreOfficeKitAnyInputCallback)(void* pData, int nMostUrgentPriority);

#ifdef __cplusplus
}
#endif

#endif // INCLUDED_LIBREOFFICEKIT_LIBREOFFICEKIT_TYPES_H

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
