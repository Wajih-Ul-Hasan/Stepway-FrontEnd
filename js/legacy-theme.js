document.addEventListener('DOMContentLoaded', function () {
    document.body.classList.add('legacy-bridge');
    const host = document.querySelector('.dashboard-content-one');
    if (host) {
        const a = document.createElement('a');
        a.className = 'sw-return'; a.href = 'workspace.html'; a.textContent = 'â† Back to workspace';
        host.prepend(a);
    }
});
