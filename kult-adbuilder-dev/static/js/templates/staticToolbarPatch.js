function createStaticTemplateToolbar() {
  if (document.getElementById('templateModeToolbar')) return;

  const bannerName = document.getElementById('bannerName');
  const canvasSize = document.getElementById('canvasSize');
  if (!bannerName || !canvasSize) return;

  const toolbarRow = canvasSize.closest('.flex');
  if (!toolbarRow || !toolbarRow.parentElement) return;

  const toolbarParent = toolbarRow.parentElement;
  toolbarParent.classList.add('items-start');

  const topRow = document.createElement('div');
  topRow.id = 'templateModeToolbar';
  topRow.className = 'flex items-center gap-3 mb-2 overflow-x-auto whitespace-nowrap';
  topRow.innerHTML = `
    <label class="text-sm text-gray-400 whitespace-nowrap">Mode:</label>
    <select id="editorModeSelect" class="bg-gray-700 rounded px-3 py-1 text-sm text-white shrink-0">
      <option value="freeform">Free-form</option>
      <option value="template">Template</option>
    </select>
    <div id="templatePickerWrap" class="hidden items-center gap-2 shrink-0">
      <label class="text-sm text-gray-400 whitespace-nowrap">Template:</label>
      <select id="templateSelect" class="bg-gray-700 rounded px-3 py-1 text-sm text-white w-48 shrink-0"></select>
    </div>
  `;

  toolbarParent.insertBefore(topRow, toolbarRow);
  toolbarRow.classList.add('min-w-0');
}

function installStaticTemplateToolbarPatch() {
  if (window.__adBuilderStaticTemplateToolbarPatchInstalled) return;
  window.__adBuilderStaticTemplateToolbarPatchInstalled = true;
  createStaticTemplateToolbar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installStaticTemplateToolbarPatch, { once: true });
} else {
  installStaticTemplateToolbarPatch();
}

window.adBuilderStaticTemplateToolbarPatch = {
  createStaticTemplateToolbar
};
