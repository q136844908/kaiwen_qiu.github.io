// Progressive enhancement: without JavaScript, all eight topic sections remain readable.
(() => {
  const selector = document.querySelector('.topic-selector');
  if (!selector) return;

  const tabs = Array.from(selector.querySelectorAll('a'));
  const panels = tabs.map((tab) => document.getElementById(tab.hash.slice(1)));
  if (!tabs.length || panels.some((panel) => !panel)) return;

  selector.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].tabIndex = 0;
  });

  function selectTopic(index, moveFocus = false) {
    tabs.forEach((tab, current) => {
      const active = current === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[current].hidden = !active;
    });
    if (moveFocus) tabs[index].focus();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      selectTopic(index);
    });
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else if (event.key === ' ') next = index;
      else return;
      event.preventDefault();
      selectTopic(next, true);
    });
  });

  function selectFromHash() {
    const index = tabs.findIndex((tab) => tab.hash === window.location.hash);
    selectTopic(index < 0 ? 0 : index);
  }

  selectFromHash();
  window.addEventListener('hashchange', selectFromHash);
})();
