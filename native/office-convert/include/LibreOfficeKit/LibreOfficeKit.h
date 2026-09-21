/* -*- Mode: C; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/*
 * This file is part of the LibreOffice project.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

#ifndef INCLUDED_LIBREOFFICEKIT_LIBREOFFICEKIT_H
#define INCLUDED_LIBREOFFICEKIT_LIBREOFFICEKIT_H

#include <stddef.h>

// the unstable API needs C99's bool
// TODO remove the C99 types from the API before making stable
#if defined LOK_USE_UNSTABLE_API || defined LIBO_INTERNAL_ONLY
# ifndef _WIN32
#  include <stdbool.h>
# endif
# include <stdint.h>
#endif

#ifdef __APPLE__
#include <TargetConditionals.h>
#endif

#include "LibreOfficeKitTypes.h"

#ifdef __cplusplus
extern "C"
{
#endif

typedef struct _LibreOfficeKit LibreOfficeKit;
typedef struct _LibreOfficeKitClass LibreOfficeKitClass;

typedef struct _LibreOfficeKitDocument LibreOfficeKitDocument;
typedef struct _LibreOfficeKitDocumentClass LibreOfficeKitDocumentClass;

// Do we have an extended member in this struct ?
#define LIBREOFFICEKIT_HAS_MEMBER(strct,member,nSize) \
    (offsetof(strct, member) < (nSize))

#define LIBREOFFICEKIT_HAS(pKit,member) LIBREOFFICEKIT_HAS_MEMBER(LibreOfficeKitClass,member,(pKit)->pClass->nSize)

struct _LibreOfficeKit
{
    LibreOfficeKitClass* pClass;
};

struct _LibreOfficeKitClass
{
    size_t  nSize;

    void (*destroy) (LibreOfficeKit* pThis);

    LibreOfficeKitDocument* (*documentLoad) (LibreOfficeKit* pThis,
                                             const char* pURL);

    char* (*getError) (LibreOfficeKit* pThis);

    /// @since LibreOffice 5.0
    LibreOfficeKitDocument* (*documentLoadWithOptions) (LibreOfficeKit* pThis,
                                                        const char* pURL,
                                                        const char* pOptions);
    /// @since LibreOffice 5.2
    void (*freeError) (char* pFree);

    /// @since LibreOffice 6.0
    void (*registerCallback) (LibreOfficeKit* pThis,
                              LibreOfficeKitCallback pCallback,
                              void* pData);

    /** @see lok::Office::getFilterTypes().
        @since LibreOffice 6.0
     */
    char* (*getFilterTypes) (LibreOfficeKit* pThis);

    /** @see lok::Office::setOptionalFeatures().
        @since LibreOffice 6.0
     */
    void (*setOptionalFeatures)(LibreOfficeKit* pThis, unsigned long long features);

    /** @see lok::Office::setDocumentPassword().
        @since LibreOffice 6.0
     */
    void (*setDocumentPassword) (LibreOfficeKit* pThis,
            char const* pURL,
            char const* pPassword);

    /** @see lok::Office::getVersionInfo().
        @since LibreOffice 6.0
     */
    char* (*getVersionInfo) (LibreOfficeKit* pThis);

    /** @see lok::Office::runMacro().
        @since LibreOffice 6.0
     */
    int (*runMacro) (LibreOfficeKit *pThis, const char* pURL);

    /** @see lok::Office::signDocument().
        @since LibreOffice 6.2
     */
     bool (*signDocument) (LibreOfficeKit* pThis,
                           const char* pUrl,
                           const unsigned char* pCertificateBinary,
                           const int nCertificateBinarySize,
                           const unsigned char* pPrivateKeyBinary,
                           const int nPrivateKeyBinarySize);

    /// @see lok::Office::runLoop()
    void (*runLoop) (LibreOfficeKit* pThis,
                     LibreOfficeKitPollCallback pPollCallback,
                     LibreOfficeKitWakeCallback pWakeCallback,
                     void* pData);

    /// @see lok::Office::sendDialogEvent
    void (*sendDialogEvent) (LibreOfficeKit* pThis,
                            unsigned long long int nLOKWindowId,
                            const char* pArguments);

    /// @see lok::Office::setOption
    void (*setOption) (LibreOfficeKit* pThis, const char* pOption, const char* pValue);

    /// @see lok::Office::dumpState
    /// @since LibreOffice 7.5
    void (*dumpState) (LibreOfficeKit* pThis, const char* pOptions, char** pState);

    /** @see lok::Office::extractRequest.
     */
    char* (*extractRequest) (LibreOfficeKit* pThis,
                           const char* pFilePath);

    /// @see lok::Office::trimMemory
    /// @since LibreOffice 7.6
    void (*trimMemory) (LibreOfficeKit* pThis, int nTarget);

    /// @see lok::Office::startURP
    void* (*startURP)(LibreOfficeKit* pThis,
                    void* pReceiveURPFromLOContext, void* pSendURPToLOContext,
                    int (*fnReceiveURPFromLO)(void* pContext, const signed char* pBuffer, int nLen),
                    int (*fnSendURPToLO)(void* pContext, signed char* pBuffer, int nLen));

    /// @see lok::Office::stopURP
    void (*stopURP)(LibreOfficeKit* pThis, void* pSendURPToLOContext);

    /// @see lok::Office::joinThreads
    int (*joinThreads)(LibreOfficeKit* pThis);

    /// @see lok::Office::startThreads
    void (*startThreads)(LibreOfficeKit* pThis);

    /// @see lok::Office::setForkedChild
    void (*setForkedChild)(LibreOfficeKit* pThis, bool bIsChild);

    /** @see lok::Office::extractDocumentStructureRequest.
     */
    char* (*extractDocumentStructureRequest)(LibreOfficeKit* pThis, const char* pFilePath,
                                             const char* pFilter);

    /// @see lok::Office::registerAnyInputCallback()
    void (*registerAnyInputCallback)(LibreOfficeKit* pThis,
                                     LibreOfficeKitAnyInputCallback pCallback, void* pData);

    /// @see lok::Office::getDocsCount().
    int (*getDocsCount) (LibreOfficeKit* pThis);
};

#define LIBREOFFICEKIT_DOCUMENT_HAS(pDoc,member) LIBREOFFICEKIT_HAS_MEMBER(LibreOfficeKitDocumentClass,member,(pDoc)->pClass->nSize)

struct _LibreOfficeKitDocument
{
    LibreOfficeKitDocumentClass* pClass;
};

struct _LibreOfficeKitDocumentClass
{
    size_t  nSize;

    void (*destroy) (LibreOfficeKitDocument* pThis);

    int (*saveAs) (LibreOfficeKitDocument* pThis,
                   const char* pUrl,
                   const char* pFormat,
                   const char* pFilterOptions);

    /** @see lok::Document::getDocumentType().
        @since LibreOffice 6.0
     */
    int (*getDocumentType) (LibreOfficeKitDocument* pThis);

#if defined LOK_USE_UNSTABLE_API || defined LIBO_INTERNAL_ONLY
    /// @see lok::Document::getParts().
    int (*getParts) (LibreOfficeKitDocument* pThis);

    /// @see lok::Document::getPartPageRectangles().
    char* (*getPartPageRectangles) (LibreOfficeKitDocument* pThis);

    /// @see lok::Document::getPart().
    int (*getPart) (LibreOfficeKitDocument* pThis);

    /// @see lok::Document::setPart().
    void (*setPart) (LibreOfficeKitDocument* pThis,
                     int nPart);

    /// @see lok::Document::getPartName().
    char* (*getPartName) (LibreOfficeKitDocument* pThis,
                          int nPart);

    /// @see lok::Document::setPartMode().
    void (*setPartMode) (LibreOfficeKitDocument* pThis,
                         int nMode);

    /// @see lok::Document::paintTile().
    void (*paintTile) (LibreOfficeKitDocument* pThis,
                       unsigned char* pBuffer,
                       const int nCanvasWidth,
                       const int nCanvasHeight,
                       const int nTilePosX,
                       const int nTilePosY,
                       const int nTileWidth,
                       const int nTileHeight);

    /// @see lok::Document::getTileMode().
    int (*getTileMode) (LibreOfficeKitDocument* pThis);

    /// @see lok::Document::getDocumentSize().
    void (*getDocumentSize) (LibreOfficeKitDocument* pThis,
                             long* pWidth,
                             long* pHeight);

    /// @see lok::Document::initializeForRendering().
    void (*initializeForRendering) (LibreOfficeKitDocument* pThis,
                                    const char* pArguments);

    /// @see lok::Document::registerCallback().
    void (*registerCallback) (LibreOfficeKitDocument* pThis,
                              LibreOfficeKitCallback pCallback,
                              void* pData);

    /// @see lok::Document::postKeyEvent
    void (*postKeyEvent) (LibreOfficeKitDocument* pThis,
                          int nType,
                          int nCharCode,
                          int nKeyCode);

    /// @see lok::Document::postMouseEvent
    void (*postMouseEvent) (LibreOfficeKitDocument* pThis,
                            int nType,
                            int nX,
                            int nY,
                            int nCount,
                            int nButtons,
                            int nModifier);

    /// @see lok::Document::postUnoCommand
    void (*postUnoCommand) (LibreOfficeKitDocument* pThis,
                            const char* pCommand,
                            const char* pArguments,
                            bool bNotifyWhenFinished);

    /// @see lok::Document::setTextSelection
    void (*setTextSelection) (LibreOfficeKitDocument* pThis,
                              int nType,
                              int nX,
                              int nY);

    /// @see lok::Document::getTextSelection
    char* (*getTextSelection) (LibreOfficeKitDocument* pThis,
                               const char* pMimeType,
                               char** pUsedMimeType);

    /// @see lok::Document::paste().
    bool (*paste) (LibreOfficeKitDocument* pThis,
                   const char* pMimeType,
                   const char* pData,
                   size_t nSize);

    /// @see lok::Document::setGraphicSelection
    void (*setGraphicSelection) (LibreOfficeKitDocument* pThis,
                                 int nType,
                                 int nX,
                                 int nY);

    /// @see lok::Document::resetSelection
    void (*resetSelection) (LibreOfficeKitDocument* pThis);

    /// @see lok::Document::getCommandValues().
    char* (*getCommandValues) (LibreOfficeKitDocument* pThis, const char* pCommand);

    /// @see lok::Document::setClientZoom().
    void (*setClientZoom) (LibreOfficeKitDocument* pThis,
            int nTilePixelWidth,
            int nTilePixelHeight,
            int nTileTwipWidth,
            int nTileTwipHeight);

    /// @see lok::Document::setVisibleArea).
    void (*setClientVisibleArea) (LibreOfficeKitDocument* pThis, int nX, int nY, int nWidth, int nHeight);

    /// @see lok::Document::createView().
    int (*createView) (LibreOfficeKitDocument* pThis);
    /// @see lok::Document::destroyView().
    void (*destroyView) (LibreOfficeKitDocument* pThis, int nId);
    /// @see lok::Document::setView().
    void (*setView) (LibreOfficeKitDocument* pThis, int nId);
    /// @see lok::Document::getView().
    int (*getView) (LibreOfficeKitDocument* pThis);
    /// @see lok::Document::getViewsCount().
    int (*getViewsCount) (LibreOfficeKitDocument* pThis);

    /// @see lok::Document::renderFont().
    unsigned char* (*renderFont) (LibreOfficeKitDocument* pThis,
                       const char* pFontName,
                       const char* pChar,
                       int* pFontWidth,
                       int* pFontHeight);

    /// @see lok::Document::getPartHash().
    char* (*getPartHash) (LibreOfficeKitDocument* pThis,
                          int nPart);

    /// Paints a tile from a specific part.
    /// @see lok::Document::paintTile().
    void (*paintPartTile) (LibreOfficeKitDocument* pThis,
                           unsigned char* pBuffer,
                           const int nPart,
                           const int nMode,
                           const int nCanvasWidth,
                           const int nCanvasHeight,
                           const int nTilePosX,
                           const int nTilePosY,
                           const int nTileWidth,
                           const int nTileHeight);

    /// @see lok::Document::getViewIds().
    bool (*getViewIds) (LibreOfficeKitDocument* pThis,
                       int* pArray,
                       size_t nSize);

    /// @see lok::Document::setOutlineState).
    void (*setOutlineState) (LibreOfficeKitDocument* pThis, bool bColumn, int nLevel, int nIndex, bool bHidden);

    /// Paints window with given id to the buffer
    /// @see lok::Document::paintWindow().
    void (*paintWindow) (LibreOfficeKitDocument* pThis, unsigned nWindowId,
                         unsigned char* pBuffer,
                         const int x, const int y,
                         const int width, const int height);

    /// @see lok::Document::postWindow().
    void (*postWindow) (LibreOfficeKitDocument* pThis, unsigned nWindowId, int nAction, const char* pData);

    /// @see lok::Document::postWindowKeyEvent().
    void (*postWindowKeyEvent) (LibreOfficeKitDocument* pThis,
                                unsigned nWindowId,
                                int nType,
                                int nCharCode,
                                int nKeyCode);

    /// @see lok::Document::postWindowMouseEvent().
    void (*postWindowMouseEvent) (LibreOfficeKitDocument* pThis,
                                  unsigned nWindowId,
                                  int nType,
                                  int nX,
                                  int nY,
                                  int nCount,
                                  int nButtons,
                                  int nModifier);

    /// @see lok::Document::setViewLanguage().
    void (*setViewLanguage) (LibreOfficeKitDocument* pThis, int nId, const char* language);

    /// @see lok::Document::postWindowExtTextInputEvent
    void (*postWindowExtTextInputEvent) (LibreOfficeKitDocument* pThis,
                                         unsigned nWindowId,
                                         int nType,
                                         const char* pText);

    /// @see lok::Document::getPartInfo().
    char* (*getPartInfo) (LibreOfficeKitDocument* pThis, int nPart);

    /// Paints window with given id to the buffer with the give DPI scale
    /// (every pixel is dpiscale-times larger).
    /// @see lok::Document::paintWindow().
    void (*paintWindowDPI) (LibreOfficeKitDocument* pThis, unsigned nWindowId,
                            unsigned char* pBuffer,
                            const int x, const int y,
                            const int width, const int height,
                            const double dpiscale);

// CERTIFICATE AND SIGNING

    /// @see lok::Document::insertCertificate().
    bool (*insertCertificate) (LibreOfficeKitDocument* pThis,
                                const unsigned char* pCertificateBinary,
                                const int nCertificateBinarySize,
                                const unsigned char* pPrivateKeyBinary,
                                const int nPrivateKeyBinarySize);

    /// @see lok::Document::addCertificate().
    bool (*addCertificate) (LibreOfficeKitDocument* pThis,
                                const unsigned char* pCertificateBinary,
                                const int nCertificateBinarySize);

    /// @see lok::Document::getSignatureState().
    int (*getSignatureState) (LibreOfficeKitDocument* pThis);
// END CERTIFICATE AND SIGNING

    /// @see lok::Document::renderShapeSelection
    size_t (*renderShapeSelection)(LibreOfficeKitDocument* pThis, char** pOutput);

    /// @see lok::Document::postWindowGestureEvent().
    void (*postWindowGestureEvent) (LibreOfficeKitDocument* pThis,
                                  unsigned nWindowId,
                                  const char* pType,
                                  int nX,
                                  int nY,
                                  int nOffset);

    /// @see lok::Document::createViewWithOptions().
    int (*createViewWithOptions) (LibreOfficeKitDocument* pThis, const char* pOptions);

    /// @see lok::Document::selectPart().
    void (*selectPart) (LibreOfficeKitDocument* pThis, int nPart, int nSelect);

    /// @see lok::Document::moveSelectedParts().
    void (*moveSelectedParts) (LibreOfficeKitDocument* pThis, int nPosition, bool bDuplicate);

    /// Resize window with given id.
    /// @see lok::Document::resizeWindow().
    void (*resizeWindow) (LibreOfficeKitDocument* pThis, unsigned nWindowId,
                          const int width, const int height);

    /// Pass a nullptr terminated array of mime-type strings
    /// @see lok::Document::getClipboard for more details
    int (*getClipboard) (LibreOfficeKitDocument* pThis,
                         const char **pMimeTypes,
                         size_t      *pOutCount,
                         char      ***pOutMimeTypes,
                         size_t     **pOutSizes,
                         char      ***pOutStreams);

    /// @see lok::Document::setClipboard
    int (*setClipboard) (LibreOfficeKitDocument* pThis,
                         const size_t   nInCount,
                         const char   **pInMimeTypes,
                         const size_t  *pInSizes,
                         const char   **pInStreams);

    /// @see lok::Document::getSelectionType
    int (*getSelectionType) (LibreOfficeKitDocument* pThis);

    /// @see lok::Document::removeTextContext
    void (*removeTextContext) (LibreOfficeKitDocument* pThis,
                               unsigned nWindowId,
                               int nBefore,
                               int nAfter);

    /// @see lok::Document::sendDialogEvent
    void (*sendDialogEvent) (LibreOfficeKitDocument* pThis,
                            unsigned long long int nLOKWindowId,
                            const char* pArguments);

    /// @see lok::Document::renderFontOrientation().
    unsigned char* (*renderFontOrientation) (LibreOfficeKitDocument* pThis,
                       const char* pFontName,
                       const char* pChar,
                       int* pFontWidth,
                       int* pFontHeight,
                       int pOrientation);

    /// Switches view to viewId if viewId >= 0, and paints window
    /// @see lok::Document::paintWindowDPI().
    void (*paintWindowForView) (LibreOfficeKitDocument* pThis, unsigned nWindowId,
                                unsigned char* pBuffer,
                                const int x, const int y,
                                const int width, const int height,
                                const double dpiscale,
                                int viewId);

    /// @see lok::Document::completeFunction().
    void (*completeFunction) (LibreOfficeKitDocument* pThis, const char* pFunctionName);

    /// @see lok::Document::setWindowTextSelection
    void (*setWindowTextSelection) (LibreOfficeKitDocument* pThis,
                                    unsigned nWindowId,
                                    bool bSwap,
                                    int nX,
                                    int nY);

    /// @see lok::Document::sendFormFieldEvent
    void (*sendFormFieldEvent) (LibreOfficeKitDocument* pThis,
                                const char* pArguments);

    /// @see lok::Document::setBlockedCommandList
    void (*setBlockedCommandList) (LibreOfficeKitDocument* pThis,
                                int nViewId,
                                const char* blockedCommandList);

    /// @see lok::Document::renderSearchResult
    bool (*renderSearchResult) (LibreOfficeKitDocument* pThis,
                                const char* pSearchResult,
                                unsigned char** pBitmapBuffer,
                                int* pWidth, int* pHeight, size_t* pByteSize);

    /// @see lok::Document::sendContentControlEvent().
    void (*sendContentControlEvent)(LibreOfficeKitDocument* pThis, const char* pArguments);

    /// @see lok::Document::getSelectionTypeAndText
    /// @since LibreOffice 7.4
    int (*getSelectionTypeAndText) (LibreOfficeKitDocument* pThis,
                                    const char* pMimeType,
                                    char** pText,
                                    char** pUsedMimeType);

    /// @see lok::Document::getDataArea().
    void (*getDataArea) (LibreOfficeKitDocument* pThis,
                         long nPart,
                         long* pCol,
                         long* pRow);

    /// @see lok::Document::getEditMode().
    int (*getEditMode) (LibreOfficeKitDocument* pThis);

    /// @see lok::Document::setViewTimezone().
    void (*setViewTimezone) (LibreOfficeKitDocument* pThis, int nId, const char* timezone);

    /// @see lok::Document::setAccessibilityState().
    void (*setAccessibilityState) (LibreOfficeKitDocument* pThis, int nId, bool nEnabled);

    /// @see lok::Document::getA11yFocusedParagraph.
    char* (*getA11yFocusedParagraph) (LibreOfficeKitDocument* pThis);

    /// @see lok::Document::getA11yCaretPosition.
    int (*getA11yCaretPosition) (LibreOfficeKitDocument* pThis);

    /// @see lok::Document::setViewReadOnly().
    void (*setViewReadOnly) (LibreOfficeKitDocument* pThis, int nId, const bool readOnly);

    /// @see lok::Document::setAllowChangeComments().
    void (*setAllowChangeComments) (LibreOfficeKitDocument* pThis, int nId, const bool allow);

    /// @see lok::Document::getPresentationInfo
    char* (*getPresentationInfo) (LibreOfficeKitDocument* pThis);

    /// @see lok::Document::createSlideRenderer
    bool (*createSlideRenderer) (
        LibreOfficeKitDocument* pThis,
        const char* pSlideHash,
        int nSlideNumber, unsigned* nViewWidth, unsigned* nViewHeight,
        bool bRenderBackground, bool bRenderMasterPage);

    /// @see lok::Document::postSlideshowCleanup
    void (*postSlideshowCleanup)(LibreOfficeKitDocument* pThis);

    /// @see lok::Document::renderNextSlideLayer
    bool (*renderNextSlideLayer)(
        LibreOfficeKitDocument* pThis, unsigned char* pBuffer, bool* bIsBitmapLayer, double* pScale, char** pJsonMessage);

    /// @see lok::Document::setViewOption
    void (*setViewOption)(LibreOfficeKitDocument* pThis, const char* pOption, const char* pValue);

    /// @see lok::Document::setColorPreviewState().
    void (*setColorPreviewState) (LibreOfficeKitDocument* pThis, int nId, bool nEnabled);

    /// @see lok::Document::setAllowManageRedlines().
    void (*setAllowManageRedlines)(LibreOfficeKitDocument* pThis, int nId, bool allow);

#endif // defined LOK_USE_UNSTABLE_API || defined LIBO_INTERNAL_ONLY
};

#ifdef __cplusplus
}
#endif

#endif // INCLUDED_LIBREOFFICEKIT_LIBREOFFICEKIT_H

/* vim:set shiftwidth=4 softtabstop=4 expandtab: */
