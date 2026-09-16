// Repair Agent Widget for DSH Desktop
(function () {
  let widgetMounted = false;
  let activeSessionId = null;
  let modelCatalog = null;
  let isVisionSupported = false;
  let isGenerating = false;
  let pendingAttachments = [];
  let currentAssistantMsgEl = null;
  let currentAssistantText = '';
  let currentAssistantThinking = '';

  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderMarkdown(md) {
    if (!md) return '';
    let html = escapeHtml(md);

    // Code blocks ```lang\ncode\n```
    html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, function (_, lang, code) {
      return '<pre><code class="language-' + escapeHtml(lang) + '">' + code + '</code></pre>';
    });

    // Inline code `code`
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // Bold **text**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Lists
    html = html.replace(/(?:^|\n)- ([^\n]+)/g, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

    // Paragraphs / line breaks
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br/>');

    return '<p>' + html + '</p>';
  }

  function checkVisionSupport(modelId, modelName) {
    const target = ((modelId || '') + ' ' + (modelName || '')).toLowerCase();
    return /vision|vl|gpt-4o|claude-3|gemini|pixtral|llava|qwen.*vl/i.test(target);
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const commaIdx = result.indexOf(',');
        resolve({
          mediaType: file.type || 'image/png',
          data: result.slice(commaIdx + 1),
          name: file.name,
          previewUrl: result
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  window.initRepairWidget = function (config) {
    if (widgetMounted) return;
    widgetMounted = true;

    const isChinese = config?.locale === 'zh' || document.documentElement.lang?.startsWith('zh');
    const defaultPrompt = config?.defaultPrompt || '';
    const suggestedQuestions = Array.isArray(config?.questions) ? config.questions : [];

    // Create FAB
    const fab = document.createElement('button');
    fab.id = 'repair-widget-fab';
    fab.className = 'repair-widget-fab';
    fab.type = 'button';
    fab.title = isChinese ? '打开系统维修 Agent' : 'Open System Repair Agent';
    fab.setAttribute('aria-label', fab.title);
    fab.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
      <span class="repair-widget-badge repair-widget-pulse"></span>
    `;

    // Create Modal Window
    const win = document.createElement('div');
    win.id = 'repair-widget-window';
    win.className = 'repair-widget-window';
    win.innerHTML = `
      <div class="repair-widget-header">
        <div class="repair-header-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2"/>
            <circle cx="12" cy="5" r="2"/>
            <path d="M12 7v4"/>
            <line x1="8" y1="16" x2="8.01" y2="16"/>
            <line x1="16" y1="16" x2="16.01" y2="16"/>
          </svg>
          <span>${isChinese ? '系统维修 Agent' : 'System Repair Agent'}</span>
          <span id="repair-vision-badge" class="repair-vision-tag" style="display:none;">📷 Vision</span>
        </div>
        <div class="repair-header-controls">
          <div class="repair-model-selector-wrap">
            <select id="repair-model-select" class="repair-model-select" title="${isChinese ? '选择模型' : 'Select Model'}">
              <option value="">${isChinese ? '正在加载模型…' : 'Loading models…'}</option>
            </select>
            <svg class="repair-model-arrow" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.2 6.2a.75.75 0 0 1 1.06 0L8 8.94l2.74-2.74a.75.75 0 1 1 1.06 1.06l-3.27 3.27a.75.75 0 0 1-1.06 0L4.2 7.26a.75.75 0 0 1 0-1.06z"/>
            </svg>
          </div>
          <button type="button" id="repair-btn-close" class="repair-btn-close" title="${isChinese ? '收起' : 'Minimize'}">×</button>
        </div>
      </div>

      <div class="repair-quick-actions" id="repair-quick-actions">
        <button type="button" class="repair-chip primary" id="repair-chip-fix">
          ⚡ ${isChinese ? '帮我分析并解决当前系统异常' : 'Analyze and fix this issue'}
        </button>
        <button type="button" class="repair-chip" id="repair-chip-rollback">
          📋 ${isChinese ? '制定最小回滚方案' : 'Generate rollback plan'}
        </button>
        ${suggestedQuestions.slice(0, 2).map((q) => `<button type="button" class="repair-chip repair-dynamic-q">${escapeHtml(q)}</button>`).join('')}
      </div>

      <div class="repair-messages" id="repair-messages">
        <div class="repair-msg assistant">
          <div class="repair-msg-content">
            ${isChinese 
              ? '你好！我是系统维修 Agent。检测到当前系统处于异常或安全模式状态。你可以点击上方快捷操作，或在下方输入信息、上传报错截图，我将协助你排查根因并提供可回滚的修复方案。' 
              : 'Hello! I am the System Repair Agent. The system is currently recovering or in Safe Mode. You can click quick actions above, or describe issues and upload error screenshots below.'}
          </div>
        </div>
      </div>

      <div class="repair-composer" id="repair-composer">
        <div class="repair-attachments-preview" id="repair-attachments-preview"></div>
        <div class="repair-input-box" id="repair-input-box">
          <input type="file" id="repair-file-input" accept="image/png,image/jpeg,image/webp,image/gif" multiple style="display:none;" />
          <button type="button" id="repair-btn-image" class="repair-btn-action repair-btn-image" title="${isChinese ? '上传报错截图' : 'Upload error screenshot'}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" ry="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          <textarea id="repair-textarea" class="repair-textarea" rows="1" placeholder="${isChinese ? '向维修 Agent 提问… (Enter 发送, Shift+Enter 换行)' : 'Ask the repair agent… (Enter to send)'}"></textarea>
          <button type="button" id="repair-btn-send" class="repair-btn-action repair-btn-send" title="${isChinese ? '发送' : 'Send'}">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.25 13.5V4.31L4.03 7.53a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.31V13.5a.75.75 0 0 1-1.5 0z"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(win);

    // References
    const modelSelect = document.getElementById('repair-model-select');
    const visionBadge = document.getElementById('repair-vision-badge');
    const messagesBox = document.getElementById('repair-messages');
    const textarea = document.getElementById('repair-textarea');
    const sendBtn = document.getElementById('repair-btn-send');
    const imageBtn = document.getElementById('repair-btn-image');
    const fileInput = document.getElementById('repair-file-input');
    const attachmentsPreview = document.getElementById('repair-attachments-preview');
    const closeBtn = document.getElementById('repair-btn-close');
    const inputBox = document.getElementById('repair-input-box');

    // Toggle Window
    fab.addEventListener('click', () => {
      win.classList.toggle('open');
      if (win.classList.contains('open')) {
        textarea.focus();
        initSessionIfNeeded();
      }
    });
    closeBtn.addEventListener('click', () => {
      win.classList.remove('open');
    });

    // Auto resize textarea
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });

    // Attachments Handling
    function renderAttachments() {
      attachmentsPreview.innerHTML = '';
      pendingAttachments.forEach((att, idx) => {
        const item = document.createElement('div');
        item.className = 'repair-attachment-item';
        item.innerHTML = `
          <img class="repair-attachment-thumb" src="${att.previewUrl}" alt="${escapeHtml(att.name)}" />
          <span>${escapeHtml(att.name || 'image')}</span>
          <button type="button" class="repair-attachment-remove" data-idx="${idx}">×</button>
        `;
        attachmentsPreview.appendChild(item);
      });
      attachmentsPreview.querySelectorAll('.repair-attachment-remove').forEach((btn) => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.getAttribute('data-idx'));
          pendingAttachments.splice(idx, 1);
          renderAttachments();
        });
      });
    }

    async function addImageFiles(files) {
      if (!isVisionSupported) {
        alert(isChinese ? '当前选中的模型不支持图像理解，请先在顶部切换到视觉模型（如 GPT-4o、Claude 3.5 Sonnet 等）。' : 'The selected model does not support vision. Please switch to a vision model first.');
        return;
      }
      for (const file of files) {
        if (file.type && file.type.startsWith('image/')) {
          try {
            const att = await readFileAsBase64(file);
            pendingAttachments.push(att);
          } catch (e) {
            console.error('Error reading image file', e);
          }
        }
      }
      renderAttachments();
    }

    imageBtn.addEventListener('click', () => {
      fileInput.click();
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files) {
        addImageFiles(Array.from(fileInput.files));
        fileInput.value = '';
      }
    });

    // Clipboard Paste Image Handling
    textarea.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        addImageFiles(imageFiles);
      }
    });

    // Drag & Drop Image Handling
    inputBox.addEventListener('dragover', (e) => {
      if (isVisionSupported) {
        e.preventDefault();
        inputBox.classList.add('repair-drag-target');
      }
    });
    inputBox.addEventListener('dragleave', () => {
      inputBox.classList.remove('repair-drag-target');
    });
    inputBox.addEventListener('drop', (e) => {
      if (!isVisionSupported) return;
      e.preventDefault();
      inputBox.classList.remove('repair-drag-target');
      if (e.dataTransfer?.files) {
        addImageFiles(Array.from(e.dataTransfer.files));
      }
    });

    // Session Initialization
    let initPromise = null;
    function renderDiagnosticCard(finding) {
      if (!finding || document.getElementById('repair-diagnostic-card')) return;
      const card = document.createElement('div');
      card.id = 'repair-diagnostic-card';
      card.className = 'repair-diagnostic-card';
      card.innerHTML = `
        <div class="repair-diag-badge">🔍 ${isChinese ? '系统离线初步诊断' : 'Offline Diagnostic Finding'}</div>
        <div class="repair-diag-summary">${escapeHtml(finding.summary)}</div>
        <div class="repair-diag-action">💡 <strong>${isChinese ? '建议操作' : 'Recommended'}:</strong> ${escapeHtml(finding.suggestedAction)}</div>
      `;
      const firstMsg = messagesBox.querySelector('.repair-msg.assistant');
      if (firstMsg) {
        firstMsg.appendChild(card);
      } else {
        messagesBox.appendChild(card);
      }
    }

    function renderErrorBanner(errorMsg) {
      const existing = document.getElementById('repair-error-banner');
      if (existing) existing.remove();

      const banner = document.createElement('div');
      banner.id = 'repair-error-banner';
      banner.className = 'repair-error-banner';
      banner.innerHTML = `
        <div class="repair-err-text">⚠️ ${escapeHtml(errorMsg || (isChinese ? '安全模式核心服务连接异常' : 'Failed to connect to Safe Mode core'))}</div>
        <button type="button" class="repair-retry-btn" id="repair-btn-retry">${isChinese ? '重新连接' : 'Retry'}</button>
      `;
      messagesBox.appendChild(banner);
      banner.querySelector('#repair-btn-retry')?.addEventListener('click', () => {
        banner.remove();
        initPromise = null;
        initSessionIfNeeded();
      });
      messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    function initSessionIfNeeded() {
      if (initPromise) return initPromise;
      if (!window.dshRepairAgent) return Promise.resolve();

      initPromise = window.dshRepairAgent.init().then((res) => {
        if (res?.diagnosticFinding) {
          renderDiagnosticCard(res.diagnosticFinding);
        }
        if (!res || !res.ok) {
          console.warn('[repair-widget] init failed', res?.error);
          renderErrorBanner(res?.error);
          return;
        }
        const errBanner = document.getElementById('repair-error-banner');
        if (errBanner) errBanner.remove();

        activeSessionId = res.sessionId;
        modelCatalog = res.modelCatalog;
        populateModelCatalog(modelCatalog);
        setupStreamListener();
      }).catch((err) => {
        console.error('[repair-widget] init error', err);
        renderErrorBanner(err?.message || String(err));
      });
      return initPromise;
    }

    function populateModelCatalog(catalog) {
      modelSelect.innerHTML = '';
      if (!catalog || !Array.isArray(catalog.groups) || catalog.groups.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = isChinese ? '默认模型' : 'Default model';
        modelSelect.appendChild(opt);
        syncVisionState('', '');
        return;
      }

      const defaultSelection = catalog.default || catalog.current || {};
      const defaultValue = (defaultSelection.provider || '') + '::' + (defaultSelection.model || '');

      catalog.groups.forEach((group) => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = group.name || group.id;
        (group.models || []).forEach((m) => {
          const opt = document.createElement('option');
          opt.value = group.id + '::' + m.id;
          const isVision = checkVisionSupport(m.id, m.name);
          opt.textContent = (m.name || m.id) + (isVision ? ' 📷' : '');
          opt.dataset.provider = group.id;
          opt.dataset.model = m.id;
          opt.dataset.vision = String(isVision);
          if (opt.value === defaultValue) opt.selected = true;
          optgroup.appendChild(opt);
        });
        modelSelect.appendChild(optgroup);
      });

      const selectedOpt = modelSelect.selectedOptions[0];
      syncVisionState(selectedOpt?.dataset.model || '', selectedOpt?.textContent || '');
    }

    function syncVisionState(modelId, modelName) {
      isVisionSupported = checkVisionSupport(modelId, modelName);
      visionBadge.style.display = isVisionSupported ? 'inline-flex' : 'none';
      imageBtn.disabled = !isVisionSupported;
      if (isVisionSupported) {
        imageBtn.title = isChinese ? '上传或粘贴报错截图' : 'Upload or paste error screenshot';
      } else {
        imageBtn.title = isChinese ? '当前模型不支持视觉输入，请切换到视觉模型' : 'Current model does not support image input';
      }
    }

    modelSelect.addEventListener('change', async () => {
      const selectedOpt = modelSelect.selectedOptions[0];
      if (!selectedOpt) return;
      const provider = selectedOpt.dataset.provider;
      const model = selectedOpt.dataset.model;
      syncVisionState(model, selectedOpt.textContent || '');

      if (activeSessionId && provider && model && window.dshRepairAgent) {
        try {
          await window.dshRepairAgent.selectModel({
            sessionId: activeSessionId,
            provider,
            model
          });
        } catch (e) {
          console.error('[repair-widget] selectModel error', e);
        }
      }
    });

    // Stream Listener
    function setupStreamListener() {
      if (!window.dshRepairAgent?.onStream) return;
      window.dshRepairAgent.onStream((frame) => {
        if (!frame) return;
        const entry = frame.event || frame;
        const type = String(entry.type || '').toLowerCase();

        if (type === 'assistant/chunk') {
          const chunk = entry.text || '';
          currentAssistantText += chunk;
          updateCurrentAssistantView();
        } else if (type === 'thinking/chunk' || type === 'reasoning/chunk') {
          const chunk = entry.text || '';
          currentAssistantThinking += chunk;
          updateCurrentAssistantView();
        } else if (type === 'turn-end' || type === 'turn/completed' || type === 'turn/finish') {
          finishGenerating();
        }
      });
    }

    function updateCurrentAssistantView() {
      if (!currentAssistantMsgEl) return;
      const contentEl = currentAssistantMsgEl.querySelector('.repair-msg-content');
      if (!contentEl) return;

      let inner = '';
      if (currentAssistantThinking) {
        inner += `<details class="repair-thinking"><summary>${isChinese ? '思考过程' : 'Thinking'}</summary><div>${escapeHtml(currentAssistantThinking)}</div></details>`;
      }
      inner += renderMarkdown(currentAssistantText);
      contentEl.innerHTML = inner;
      messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    function finishGenerating() {
      isGenerating = false;
      sendBtn.classList.remove('repair-btn-stop');
      sendBtn.title = isChinese ? '发送' : 'Send';
      sendBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
          <path d="M7.25 13.5V4.31L4.03 7.53a.75.75 0 0 1-1.06-1.06l4.5-4.5a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.31V13.5a.75.75 0 0 1-1.5 0z"/>
        </svg>
      `;
      const status = currentAssistantMsgEl?.querySelector('.repair-generating-status');
      if (status) status.remove();
      currentAssistantMsgEl = null;
    }

    // Sending prompts
    async function sendPrompt(text, images = []) {
      if (isGenerating) {
        // Cancel turn
        if (activeSessionId && window.dshRepairAgent) {
          void window.dshRepairAgent.cancel(activeSessionId);
        }
        finishGenerating();
        return;
      }

      const promptText = (text || '').trim();
      if (!promptText && images.length === 0) return;

      await initSessionIfNeeded();
      if (!activeSessionId) {
        alert(isChinese ? '维修 Agent 正在启动或暂不可用，请稍候重试。' : 'Repair Agent is not ready. Please try again.');
        return;
      }

      // Render User Message
      const userMsg = document.createElement('div');
      userMsg.className = 'repair-msg user';
      let userHtml = '';
      if (images.length > 0) {
        userHtml += '<div class="repair-msg-images">';
        images.forEach((img) => {
          userHtml += `<img class="repair-msg-img" src="${img.previewUrl}" alt="" />`;
        });
        userHtml += '</div>';
      }
      if (promptText) {
        userHtml += `<div>${escapeHtml(promptText)}</div>`;
      }
      userMsg.innerHTML = userHtml;
      messagesBox.appendChild(userMsg);

      // Render Assistant Skeleton Message
      currentAssistantText = '';
      currentAssistantThinking = '';
      const assistantMsg = document.createElement('div');
      assistantMsg.className = 'repair-msg assistant';
      assistantMsg.innerHTML = `
        <div class="repair-msg-content"></div>
        <div class="repair-generating-status">
          <span class="repair-spinner"></span>
          <span>${isChinese ? '正在分析系统状态…' : 'Analyzing system status…'}</span>
        </div>
      `;
      messagesBox.appendChild(assistantMsg);
      currentAssistantMsgEl = assistantMsg;
      messagesBox.scrollTop = messagesBox.scrollHeight;

      // Update UI State
      isGenerating = true;
      sendBtn.classList.add('repair-btn-stop');
      sendBtn.title = isChinese ? '停止生成' : 'Stop generating';
      sendBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <rect width="14" height="14" x="1" y="1" rx="2"/>
        </svg>
      `;

      textarea.value = '';
      textarea.style.height = 'auto';
      pendingAttachments = [];
      renderAttachments();

      try {
        const payload = {
          sessionId: activeSessionId,
          text: promptText,
          images: images.map((img) => ({
            mediaType: img.mediaType,
            data: img.data,
            name: img.name
          }))
        };
        const res = await window.dshRepairAgent.sendPrompt(payload);
        if (!res || !res.ok) {
          throw new Error(res?.error || 'Failed to send prompt');
        }
      } catch (err) {
        console.error('[repair-widget] sendPrompt failed', err);
        const errDiv = document.createElement('div');
        errDiv.style.color = 'var(--danger, #ee7772)';
        errDiv.style.fontSize = '11px';
        errDiv.textContent = (isChinese ? '发送失败：' : 'Send failed: ') + (err.message || err);
        assistantMsg.appendChild(errDiv);
        finishGenerating();
      }
    }

    sendBtn.addEventListener('click', () => {
      if (isGenerating) {
        sendPrompt('');
      } else {
        sendPrompt(textarea.value, [...pendingAttachments]);
      }
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        sendPrompt(textarea.value, [...pendingAttachments]);
      }
    });

    // Quick Action Buttons
    document.getElementById('repair-chip-fix')?.addEventListener('click', () => {
      sendPrompt(defaultPrompt || (isChinese ? '请帮我分析并解决当前系统出现的启动或插件异常。' : 'Please analyze and fix the current system startup or plugin issues.'));
    });

    document.getElementById('repair-chip-rollback')?.addEventListener('click', () => {
      sendPrompt(isChinese ? '如果需要回滚，请为当前故障提供一个可立刻执行且风险最小的回滚方案。' : 'Please provide a minimal, low-risk rollback plan for this issue.');
    });

    win.querySelectorAll('.repair-dynamic-q').forEach((btn) => {
      btn.addEventListener('click', () => {
        sendPrompt(btn.textContent.trim());
      });
    });
  };
})();
