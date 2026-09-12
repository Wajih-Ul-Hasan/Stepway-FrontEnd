document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('account-form');
    const message = document.getElementById('account-message');
    const submit = document.getElementById('account-submit');

    function tokenFromUrl() {
        return new URLSearchParams(window.location.search).get('token') || '';
    }

    async function api(path, options) {
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), 20000);
        try {
            const response = await fetch(stepwayApi(path), Object.assign({signal: abort.signal}, options));
            let data = {};
            try { data = await response.json(); } catch (ignore) {}
            if (!response.ok) throw new Error(data.message || 'The link is invalid or expired.');
            return data;
        } finally {
            clearTimeout(timer);
        }
    }

    async function verifyEmail() {
        const title = document.getElementById('verify-title');
        const token = tokenFromUrl();
        if (!token) {
            title.textContent = 'Verification link missing.';
            message.textContent = 'Open the verification link from your email.';
            return;
        }
        try {
            const data = await api('/api/auth/verify-email?token=' + encodeURIComponent(token), {method: 'GET'});
            title.textContent = 'Email verified.';
            message.style.color = 'var(--green)';
            message.textContent = data.message || 'Email verified successfully.';
        } catch (error) {
            title.textContent = 'Verification failed.';
            message.style.color = '';
            message.textContent = error.name === 'AbortError' || error instanceof TypeError
                ? 'We could not reach Stepway. Please try again in a moment.' : error.message;
        }
    }

    if (!form) {
        verifyEmail();
        return;
    }

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const mode = form.dataset.mode;
        const label = submit.textContent;
        submit.disabled = true;
        submit.textContent = 'Please wait...';
        message.style.color = '';
        message.textContent = '';
        try {
            const body = mode === 'forgot-password'
                ? {email: document.getElementById('email').value.trim()}
                : {token: tokenFromUrl(), newPassword: document.getElementById('password').value};
            const data = await api(mode === 'forgot-password' ? '/api/auth/forgot-password' : '/api/auth/reset-password', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body)
            });
            form.reset();
            message.style.color = 'var(--green)';
            message.textContent = data.message || 'Done.';
        } catch (error) {
            message.textContent = error.name === 'AbortError' || error instanceof TypeError
                ? 'We could not reach Stepway. Please try again in a moment.' : error.message;
        } finally {
            submit.disabled = false;
            submit.textContent = label;
        }
    });
});
