// Render a Leaflet popup HTML string for a council record
export default function CouncilPopup({ council, councilKey, lgaName, rules }) {
  const status = council.status || 'unknown';
  const sources = council.sources || [];
  const prohibited = council.prohibited_areas || [];
  const permitted = council.permitted_areas || [];
  const notes = council.notes || [];

  const esc = (s) => String(s).replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]),
  );

  const sections = [];

  if (prohibited.length) {
    sections.push(`
      <div class="popup-section">
        <strong>Prohibited</strong>
        <ul class="popup-list">${prohibited.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      </div>
    `);
  }

  if (permitted.length) {
    sections.push(`
      <div class="popup-section">
        <strong>Where you can fly</strong>
        <ul class="popup-list">${permitted.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      </div>
    `);
  }

  if (notes.length) {
    sections.push(`
      <div class="popup-section">
        <strong>Notes</strong>
        <ul class="popup-list">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
      </div>
    `);
  }

  // CTA buttons for permit and policy links — surfaced above sources for prominence
  const ctas = [];
  if (council.permit_url) {
    ctas.push(
      `<a class="popup-cta cta-${status}" href="${esc(council.permit_url)}" target="_blank" rel="noopener">${esc(council.permit_label || 'Apply for permit')} ↗</a>`,
    );
  }
  if (council.policy_url) {
    ctas.push(
      `<a class="popup-cta cta-secondary" href="${esc(council.policy_url)}" target="_blank" rel="noopener">${esc(council.policy_label || 'Read Council policy')} ↗</a>`,
    );
  }
  const ctaBlock = ctas.length
    ? `<div class="popup-ctas">${ctas.join('')}</div>`
    : '';

  // NSW state reminder (NPWS)
  if (rules.nsw_state && rules.nsw_state.status === 'permit') {
    sections.push(`
      <div class="popup-section">
        <strong>NSW state rule</strong>
        <div class="popup-summary">${esc(rules.nsw_state.summary)}</div>
        <a class="popup-link" href="${esc(rules.nsw_state.source)}" target="_blank" rel="noopener">NSW NPWS policy ↗</a>
      </div>
    `);
  }

  const sourceLinks = sources
    .map((s) => `<a class="popup-link" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title || 'source')} ↗</a>`)
    .join('');

  const lastUpdated = council.last_updated
    ? `<div class="popup-warning">Last verified: ${esc(council.last_updated)}${council.needs_verification ? ' · needs re-verification' : ''}</div>`
    : '';

  return `
    <div class="popup-title">${esc(council.display_name || lgaName)}</div>
    <div class="status-badge ${status}">${esc(status)}</div>
    <div class="popup-summary">${esc(council.summary || '')}</div>
    ${ctaBlock}
    ${sections.join('')}
    ${sourceLinks ? `<div class="popup-section"><strong>Sources</strong>${sourceLinks}</div>` : ''}
    ${lastUpdated}
  `;
}