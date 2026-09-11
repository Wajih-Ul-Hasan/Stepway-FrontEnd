document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('auth-form');
    const message = document.getElementById('auth-message');
    const submit = document.getElementById('auth-submit');
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (!form.reportValidity()) return;
        submit.disabled = true; message.textContent = '';
        const label = submit.textContent; submit.textContent = 'Please wait…';
        const signup = form.dataset.mode === 'signup';
        const body = {email: document.getElementById('username').value.trim(), password: document.getElementById('password').value};
        if (signup) Object.assign(body, {firstName: document.getElementById('firstName').value.trim(), lastName: document.getElementById('lastName').value.trim(), role: 'ROLE_STUDENT'});
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), 20000);
        try {
            const response = await fetch(stepwayApi(signup ? '/api/user' : '/api/login'), {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: abort.signal
            });
            if (!response.ok) throw new Error(signup ? 'Could not create your account. Check your details or try signing in if you already registered.' : 'Could not sign in. Check your email and password.');
            if (signup) {
                form.reset(); message.style.color = 'var(--green)';
                message.textContent = 'Your account is ready. You can now sign in.';
                const link = document.createElement('a'); link.href = 'index.html'; link.textContent = ' Go to sign in →'; message.append(link);
            } else {
                const data = await response.json();
                if (typeof data.accessToken !== 'string') throw new Error('The server returned an invalid login response.');
                localStorage.setItem('token', data.accessToken);
                window.location.href = 'workspace.html';
            }
        } catch (error) {
            message.style.color = '';
            message.textContent = error.name === 'AbortError' || error instanceof TypeError
                ? 'We could not reach Stepway. Please try again in a moment.' : error.message;
        } finally {clearTimeout(timer); submit.disabled = false; submit.textContent = label;}
    });
});
