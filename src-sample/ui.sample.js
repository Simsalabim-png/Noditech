/*
 * 9.8-pc1 candidate UI.
 * Thin browser layer over the headless-safe sample engine.
 */
;(function () {
  'use strict';

  if (typeof document === 'undefined') return;

  var engine = typeof NoditechEngineSample !== 'undefined'
    ? NoditechEngineSample
    : null;

  var form = document.getElementById('calculation-form');
  var capacityField = document.getElementById('cooling-capacity');
  var powerField = document.getElementById('electrical-power');
  var panel = document.getElementById('result-panel');
  var statusLabel = document.getElementById('status-label');
  var resultValue = document.getElementById('result-value');
  var issueList = document.getElementById('issue-list');

  if (!form || !capacityField || !powerField || !panel
      || !statusLabel || !resultValue || !issueList || !engine) {
    return;
  }

  panel.setAttribute('data-engine', 'ready');

  function clearFieldErrors() {
    capacityField.removeAttribute('aria-invalid');
    powerField.removeAttribute('aria-invalid');
  }

  function issue(message, correctiveAction, field) {
    return {
      message: message,
      corrective_action: correctiveAction,
      field: field
    };
  }

  function renderIssues(issues) {
    issueList.textContent = '';

    issues.forEach(function (item) {
      var li = document.createElement('li');
      var strong = document.createElement('strong');
      strong.textContent = item.message + ' ';

      li.appendChild(strong);
      li.appendChild(document.createTextNode(item.corrective_action));
      issueList.appendChild(li);
    });

    issueList.hidden = issues.length === 0;
  }

  function render(state) {
    panel.setAttribute('data-status', state.status);
    statusLabel.textContent = state.label;
    resultValue.textContent = state.resultText;
    renderIssues(state.issues);

    if (state.status === 'blocked') {
      panel.setAttribute('role', 'alert');
      panel.setAttribute('aria-live', 'assertive');
    } else {
      panel.setAttribute('role', 'status');
      panel.setAttribute('aria-live', 'polite');
    }
  }

  function block(issues) {
    render({
      status: 'blocked',
      label: 'Beregning blokkert',
      resultText: 'Resultat er ikke tilgjengelig.',
      issues: issues
    });

    var firstField = issues[0] && issues[0].field;
    var target = firstField === 'cooling-capacity'
      ? capacityField
      : powerField;

    target.setAttribute('aria-invalid', 'true');
    target.focus();
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearFieldErrors();

    var capacity = Number(capacityField.value);
    var power = Number(powerField.value);
    var blockingIssues = [];

    if (!capacityField.value || !Number.isFinite(capacity) || capacity <= 0) {
      blockingIssues.push(issue(
        'Kjølekapasiteten mangler eller er ugyldig.',
        'Fyll inn en positiv kjølekapasitet.',
        'cooling-capacity'
      ));
    }

    if (!powerField.value || !Number.isFinite(power) || power <= 0) {
      blockingIssues.push(issue(
        'Elektrisk effekt mangler eller er ugyldig.',
        'Fyll inn en positiv elektrisk effekt.',
        'electrical-power'
      ));
    }

    if (blockingIssues.length) {
      block(blockingIssues);
      return;
    }

    var value = engine.eer(capacity, power);

    if (!Number.isFinite(value)) {
      block([issue(
        'Beregningen kunne ikke fullføres.',
        'Kontroller begge verdiene og prøv igjen.',
        'cooling-capacity'
      )]);
      return;
    }

    if (value > 8) {
      render({
        status: 'warning',
        label: 'Resultat med begrensninger',
        resultText: 'EER: ' + value.toFixed(2),
        issues: [issue(
          'Resultatet er uvanlig høyt.',
          'Kontroller enheter og registrerte måleverdier.',
          null
        )]
      });
      panel.focus();
      return;
    }

    render({
      status: 'valid',
      label: 'Resultat klart',
      resultText: 'EER: ' + value.toFixed(2),
      issues: []
    });
    panel.focus();
  });
})();
