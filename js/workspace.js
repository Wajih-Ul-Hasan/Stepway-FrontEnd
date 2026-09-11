(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const statusNames = {PLANNED: 'Planned', IN_PROGRESS: 'In progress', COMPLETED: 'Completed'};
    const token = localStorage.getItem('token');
    let claims;
    try {
        if (!token) throw new Error();
        let value = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        value = value.padEnd(Math.ceil(value.length / 4) * 4, '=');
        claims = JSON.parse(decodeURIComponent(Array.from(atob(value), c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
        if (!Array.isArray(claims.ROLES) || !claims.exp || claims.exp * 1000 <= Date.now()) throw new Error();
    } catch (_) {
        localStorage.removeItem('token'); window.location.replace('index.html'); return;
    }
    const role = claims.ROLES.includes('ADMIN') ? 'ADMIN' : claims.ROLES.includes('TEACHER') ? 'TEACHER' : 'STUDENT';
    const view = document.body.dataset.view || 'overview';
    let goals = [], courses = [], enrolled = new Set(), coursePage = 0, moreCourses = false;
    let goalsReady = false, enrollmentReady = false;
    const errors = {};
    const el = (tag, text, className) => {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    };
    function showErrors() { $('status').textContent = Object.values(errors).filter(Boolean).join(' '); }
    async function api(path, options = {}) {
        const abort = new AbortController();
        const timeout = setTimeout(() => abort.abort(), 20000);
        try {
            const response = await fetch(stepwayApi(path), {...options, signal: abort.signal,
                headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...options.headers}});
            if (response.status === 401) {
                localStorage.removeItem('token'); window.location.replace('index.html');
                throw new Error('Your session has expired. Please sign in again.');
            }
            if (!response.ok) {
                let data = {}; try { data = await response.json(); } catch (_) {}
                throw new Error(data.message || (response.status === 403 ? 'You do not have permission for this action.' : 'This request could not be completed. Please try again.'));
            }
            return response.status === 204 ? null : response.json();
        } catch (error) {
            if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('Stepway could not be reached. Use Refresh to try again.');
            throw error;
        } finally {clearTimeout(timeout);}
    }
    function safeUrl(raw) {
        try {const url = new URL(raw); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;} catch (_) {return null;}
    }
    function localDay() {const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');}
    function dateLabel(value) {
        if (!value) return 'No target date';
        const date = new Date(value + 'T12:00:00');
        return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'});
    }
    function link(text, href) {const a = el('a', text, 'btn secondary small'); a.href = href; return a;}
    $('role-label').textContent = role === 'ADMIN' ? 'ADMINISTRATOR WORKSPACE' : role === 'TEACHER' ? 'EDUCATOR WORKSPACE' : 'STUDENT WORKSPACE';
    $('account-email').textContent = claims.sub || '';
    $('avatar').textContent = (claims.sub || 'S').slice(0,1).toUpperCase();
    $('report-owner').textContent = 'Personal progress summary · ' + claims.sub + ' · ' + new Date().toLocaleDateString();
    $('signout').addEventListener('click', () => {localStorage.removeItem('token'); window.location.href = 'index.html';});
    document.querySelector('[data-nav="' + (view === 'enrolled' ? 'courses' : view) + '"]')?.classList.add('active');
    document.querySelector('.side nav').append(link('My courses', role === 'TEACHER' ? 'TeacherCourses.html' : 'StudentCourses.html'));
    if (role === 'STUDENT') document.querySelector('.side nav').append(link('Certificates', 'StudentCertifications.html'));
    if (role === 'ADMIN') {
        $('metric-one-label').textContent = 'Courses available';
        $('metric-one-note').textContent = 'Across your platform';
        for (const [label, href] of [['Manage students ↗','all-student.html'],['Manage teachers ↗','all-teacher.html'],['Manage courses ↗','all-class.html'],['Institutions ↗','affiliatedUniversties.html']]) $('management').append(link(label, href));
        $('publish-notice').hidden = false;
    } else if (role === 'TEACHER') {
        $('management').append(link('Create an assessment ↗', 'addAssessment.html'));
    }
    if (view !== 'overview') {
        $('overview-content').hidden = true; $('goals').hidden = true; $('new-goal').hidden = true;
        $('courses-section').hidden = view === 'notices';
        $('notices-section').hidden = view !== 'notices';
        $('page-title').textContent = view === 'notices' ? 'Stay in the loop.' : view === 'enrolled' ? 'Your learning, in one place.' : 'Find your next opportunity.';
        $('page-description').textContent = view === 'notices' ? 'The latest announcements from your academic community.' : 'Explore practical learning and build on what you know.';
    }
    if (view === 'enrolled') $('courses-title').textContent = 'My enrolled courses';

    function renderGoals() {
        const done = goals.filter(g => g.status === 'COMPLETED').length;
        $('metric-active').textContent = goals.filter(g => g.status === 'IN_PROGRESS').length;
        $('metric-done').textContent = done;
        $('metric-evidence').textContent = goals.filter(g => g.status === 'COMPLETED' && safeUrl(g.evidenceUrl)).length;
        const pct = goals.length ? Math.round(done / goals.length * 100) : 0;
        $('goal-progress-fill').style.width = pct + '%';
        $('goal-progress').setAttribute('aria-valuenow', pct);
        $('progress-caption').textContent = done + ' of ' + goals.length + ' goals completed · ' + pct + '%';
        const board = $('goal-board'); board.replaceChildren();
        for (const [state, label] of Object.entries(statusNames)) {
            const group = goals.filter(g => g.status === state);
            const lane = el('section', undefined, 'lane');
            const head = el('h3', label, 'lane-head'); head.append(el('span', String(group.length))); lane.append(head);
            if (!group.length) lane.append(el('p', state === 'PLANNED' ? 'Your next idea belongs here. Add a goal to get started.' : 'Goals will appear here as you make progress.', 'empty'));
            for (const goal of group) {
                const card = el('article', undefined, 'goal');
                if (goal.skill) card.append(el('span', goal.skill, 'tag'));
                card.append(el('h3', goal.title));
                if (goal.description) card.append(el('p', goal.description));
                const overdue = goal.dueDate && goal.dueDate < localDay() && goal.status !== 'COMPLETED';
                card.append(el('div', (overdue ? 'Overdue · ' : goal.dueDate ? 'Target · ' : '') + dateLabel(goal.dueDate), 'due' + (overdue ? ' overdue' : '')));
                const url = safeUrl(goal.evidenceUrl);
                if (url) {const a = el('a','View evidence ↗','text-btn'); a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; card.append(a);}
                const controls = el('div',undefined,'goal-actions');
                const select = document.createElement('select'); select.setAttribute('aria-label','Progress for ' + goal.title);
                for (const [key, value] of Object.entries(statusNames)) {const o = el('option',value); o.value=key; select.append(o);}
                select.value = goal.status;
                select.addEventListener('change',async () => {
                    const next = select.value; select.disabled=true;
                    try {await api('/api/me/goals/' + goal.id,{method:'PUT',body:JSON.stringify(payload(goal,next))}); await loadGoals();}
                    catch(error){select.value=goal.status; errors.action=error.message; showErrors();}
                    finally {select.disabled=false;}
                });
                const edit = el('button','Edit','text-btn'); edit.addEventListener('click', () => openGoal(goal));
                const del = el('button','Delete','text-btn'); del.setAttribute('aria-label','Delete ' + goal.title);
                del.addEventListener('click',async () => {
                    if (!window.confirm('Delete "' + goal.title + '"? This cannot be undone.')) return;
                    del.disabled = true;
                    try {await api('/api/me/goals/' + goal.id,{method:'DELETE'}); await loadGoals();}
                    catch(error){errors.action=error.message;showErrors();del.disabled=false;}
                });
                controls.append(select,edit,del); card.append(controls); lane.append(card);
            }
            board.append(lane);
        }
    }
    function payload(goal, state) {return {title:goal.title,description:goal.description,skill:goal.skill,evidenceUrl:goal.evidenceUrl,dueDate:goal.dueDate || null,status:state || goal.status};}
    async function loadGoals() {
        try {
            goals = await api('/api/me/goals'); goalsReady = true; delete errors.goals; delete errors.action;
            renderGoals(); $('export-report').disabled=false;
        } catch(error) {
            goalsReady=false; errors.goals='Learning board: ' + error.message;
            $('goal-board').replaceChildren(el('p','Could not load your goals. Use Refresh to try again.','empty'));
            $('progress-caption').textContent='Progress unavailable'; $('export-report').disabled=true;
            for(const id of ['metric-active','metric-done','metric-evidence']) $(id).textContent='—';
        }
        showErrors();
    }
    function openGoal(goal) {
        $('goal-form').reset(); $('goal-error').textContent=''; $('goal-id').value=goal ? goal.id : '';
        $('goal-dialog-title').textContent=goal ? 'Keep your goal moving.' : 'A goal worth working on.';
        for(const [id,key] of [['goal-title','title'],['goal-description','description'],['goal-skill','skill'],['goal-due','dueDate'],['goal-evidence','evidenceUrl']]) $(id).value=goal ? goal[key] || '' : '';
        $('goal-status').value=goal ? goal.status : 'PLANNED';
        $('goal-dialog').showModal(); $('goal-title').focus();
    }
    $('new-goal').addEventListener('click',() => openGoal(null));
    for(const id of ['close-dialog','cancel-dialog']) $(id).addEventListener('click',() => $('goal-dialog').close());
    $('goal-form').addEventListener('submit', async event => {
        event.preventDefault();
        if (!$('goal-form').reportValidity()) return;
        const data={title:$('goal-title').value.trim(),description:$('goal-description').value.trim(),skill:$('goal-skill').value.trim(),dueDate:$('goal-due').value || null,evidenceUrl:$('goal-evidence').value.trim(),status:$('goal-status').value};
        if (!data.title) {$('goal-error').textContent='Give your goal a title.';return;}
        if (data.evidenceUrl && !safeUrl(data.evidenceUrl)) {$('goal-error').textContent='Use an HTTP or HTTPS evidence link without credentials.';return;}
        const id=$('goal-id').value; $('save-goal').disabled=true;
        try {await api('/api/me/goals' + (id ? '/' + id : ''),{method:id ? 'PUT' : 'POST',body:JSON.stringify(data)}); $('goal-dialog').close(); await loadGoals();}
        catch(error){$('goal-error').textContent=error.message;}
        finally {$('save-goal').disabled=false;}
    });
    $('export-report').addEventListener('click',() => {if (goalsReady) window.print();});
    $('export-report').disabled=true;
    async function loadEnrollment() {
        try {const mine = await api('/api/courses'); enrolled = new Set(mine.map(c => c.id)); enrollmentReady=true; delete errors.enrollment;
            if (role !== 'ADMIN') $('metric-one').textContent=mine.length;
            if(view === 'enrolled') courses=mine;
        } catch(error){enrollmentReady=false;errors.enrollment='Enrolled courses: '+error.message;}
    }
    async function loadCourses(reset=true) {
        if(reset){coursePage=0;courses=[];}
        try {
            if(view === 'enrolled') {await loadEnrollment(); if (!enrollmentReady) throw new Error('Your enrolled courses could not be loaded.'); moreCourses=false;}
            else {const page=await api('/api/allCourses?pageNumber='+coursePage+'&pageSize=12&sortBy=id&sortDir=desc'); courses=reset ? page : courses.concat(page); moreCourses=page.length===12; coursePage++;}
            delete errors.courses;renderCourses();
        } catch(error) {errors.courses='Courses: '+error.message; $('course-list').replaceChildren(el('p','Courses are unavailable. Use Refresh to try again.','empty'));}
        $('load-courses').hidden=!moreCourses;showErrors();
    }
    function renderCourses() {
        const query=$('course-search').value.trim().toLowerCase();
        const filtered=courses.filter(c => ((c.courseName || '')+' '+(c.description || '')).toLowerCase().includes(query));
        const list=$('course-list');list.replaceChildren();
        $('course-count').textContent=filtered.length+' matching courses in '+courses.length+' loaded';
        if(!filtered.length) list.append(el('p',query ? 'No loaded courses match your search. Try another term or load more courses.' : 'No courses here yet. Check back soon or explore the course catalog.','empty'));
        for(const course of filtered) {
            const card=el('article',undefined,'course');const art=el('div','↗','course-art');art.append(el('span',(course.type || 'COURSE').toUpperCase()));card.append(art);
            const body=el('div',undefined,'course-body');body.append(el('h3',course.courseName || 'Untitled course'),el('p',course.description || 'Explore this learning opportunity.'));
            body.append(el('p',dateLabel(course.startDate)+' – '+dateLabel(course.endDate)));
            const footer=el('div',undefined,'course-footer');
            footer.append(el('span',course.price == null ? 'Fee not specified' : 'Fee: '+Number(course.price).toLocaleString()));
            if (enrolled.has(course.id)) footer.append(el('span','Enrolled','tag'));
            else if(role === 'STUDENT') {
                const enroll=el('button',enrollmentReady ? 'Enroll ↗' : 'Enrollment unavailable','btn small');enroll.disabled=!enrollmentReady;
                enroll.addEventListener('click',async () => {
                    enroll.disabled=true;
                    try {await api('/api/available-enrollment',{method:'POST',body:JSON.stringify({courseId:course.id})}); enrolled.add(course.id); delete errors.action; await loadEnrollment();renderCourses();showErrors();}
                    catch(error){errors.action=error.message;showErrors();enroll.disabled=false;}
                });footer.append(enroll);
            }
            const details = el('button','Course details','text-btn');
            details.addEventListener('click', () => openCourse(course));
            body.append(footer, details);card.append(body);list.append(card);
        }
    }
    async function openCourse(course) {
        const dialog = el('dialog',undefined,'modal');
        const heading = el('h2',course.courseName || 'Course details'); heading.id='course-dialog-title';
        dialog.setAttribute('aria-labelledby','course-dialog-title');
        const close=el('button','Close','btn secondary small');close.addEventListener('click',()=>dialog.close());
        const content=el('div',undefined,'course-details');
        dialog.append(heading,el('p',course.description || '', 'muted'),content,close);
        dialog.addEventListener('close',()=>dialog.remove(),{once:true});
        document.body.append(dialog);dialog.showModal();
        content.append(el('p','Loading assessments and resources…','loading'));
        const results=await Promise.allSettled([api('/api/allAssessments/'+course.id),api('/api/allContent')]);
        content.replaceChildren(el('h3','Assessments'));
        if(results[0].status==='fulfilled') {
            const assessments=results[0].value;
            if(!assessments.length) content.append(el('p','No assessments have been published yet.','muted'));
            for(const item of assessments) {const row=el('article',undefined,'notice');row.append(el('p',item.description || 'Assessment'),el('small',dateLabel(item.date)));content.append(row);}
        } else content.append(el('p','Assessments could not be loaded. Close and reopen to retry.','status'));
        content.append(el('h3','Learning resources'));
        if(results[1].status==='fulfilled') {
            const resources=results[1].value.filter(r=>Number(r.courseId)===Number(course.id));
            if(!resources.length) content.append(el('p','No learning resources have been published yet.','muted'));
            for(const item of resources) {
                const url=safeUrl(item.url);
                if(url) {const a=link((item.title || 'Open resource')+' ↗',url);a.target='_blank';a.rel='noopener noreferrer';content.append(a);}
                else content.append(el('p',(item.title || 'Resource')+' — link unavailable','muted'));
            }
        } else content.append(el('p','Resources could not be loaded. Close and reopen to retry.','status'));
    }
    async function loadNotices() {
        try {
            const notices=await api('/api/allNotices');const list=$('notice-list');list.replaceChildren();
            notices.sort((a,b) => b.id-a.id);
            if(!notices.length) list.append(el('p','No announcements yet. You are all caught up.','empty'));
            for(const notice of notices) {const item=el('article',undefined,'notice');item.append(el('h3',notice.title || 'Announcement'),el('p',notice.details || ''),el('small',[notice.postedBy,notice.date].filter(Boolean).join(' · ')));list.append(item);}
            delete errors.notices;
        } catch(error){errors.notices='Noticeboard: '+error.message;$('notice-list').replaceChildren(el('p','Announcements are unavailable. Use Refresh to try again.','empty'));}
        showErrors();
    }
    async function refresh() {
        $('refresh').disabled=true;
        try {
            const jobs=[];
            if(view==='overview') jobs.push(loadGoals());
            if(view!=='notices') jobs.push((async()=>{if(view!=='enrolled') await loadEnrollment();await loadCourses();})());
            if(view==='overview'||view==='notices') jobs.push(loadNotices());
            if(role==='ADMIN'&&view==='overview') jobs.push(api('/api/totalCourses').then(n=>{$('metric-one').textContent=n;delete errors.count;}).catch(e=>{errors.count=e.message;}));
            await Promise.allSettled(jobs);
        } finally {$('refresh').disabled=false;showErrors();}
    }
    $('refresh').addEventListener('click',refresh);
    $('course-search').addEventListener('input',renderCourses);
    $('load-courses').addEventListener('click',async()=>{$('load-courses').disabled=true;try{await loadCourses(false);}finally{$('load-courses').disabled=false;}});
    refresh();
}());
