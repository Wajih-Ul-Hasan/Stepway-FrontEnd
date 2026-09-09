async function login() {
    try {
        const response = await fetch(stepwayApi('/api/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: document.getElementById('username').value,
                password: document.getElementById('password').value
            })
        });
        if (!response.ok) throw new Error('Login failed');
        const data = await response.json();
        if (typeof data.accessToken !== 'string') throw new Error('Missing token');
        const roles = parseJwt(data.accessToken).ROLES || [];
        const page = roles.includes('ADMIN') ? 'AdminDashboard.html'
            : roles.includes('STUDENT') ? 'StudentDashboard.html'
            : roles.includes('TEACHER') ? 'TeacherDashboard.html' : null;
        if (!page) throw new Error('No supported role');
        localStorage.setItem('token', data.accessToken);
        window.location.href = page;
    } catch (error) {
        localStorage.removeItem('token');
        alert('Login failed. Please check your credentials and try again.');
    }
}

function parseJwt(token) {
    let base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    base64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(decodeURIComponent(Array.from(atob(base64),
        c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
}
