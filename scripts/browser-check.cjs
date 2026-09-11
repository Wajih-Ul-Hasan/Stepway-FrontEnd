const {chromium} = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert/strict');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'artifacts');fs.mkdirSync(output,{recursive:true});
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+(pathname==='/'?'/frontPage.html':pathname));
 if(!file.startsWith(path.resolve(root)+path.sep)){res.writeHead(403);res.end();return;}
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'};
 try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}catch(e){res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const token='header.'+Buffer.from(JSON.stringify({sub:'student@example.com',ROLES:['STUDENT'],exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature';
 let goals=[],mine=[];
 const courses=[{id:1,courseName:'Software architecture',description:'Design systems with clear boundaries.',type:'Course',price:0,startDate:'2026-09-01',endDate:'2026-12-01'},{id:2,courseName:'Applied testing',description:'Build confidence in the code you ship.',type:'Workshop',price:1000,startDate:'2026-09-15',endDate:'2026-10-01'}];
 await page.route('**/api/**',async route=>{
  const req=route.request();const url=new URL(req.url());let data={};
  if(url.pathname==='/api/login')data={accessToken:token};
  else if(url.pathname==='/api/user')data={id:7};
  else if(url.pathname==='/api/me/goals'){
   if(req.method()==='POST'){const g={...req.postDataJSON(),id:goals.length+1};goals.push(g);data=g;}else data=goals;
  }else if(url.pathname.startsWith('/api/me/goals/')){
   const id=Number(url.pathname.split('/').pop());
   if(req.method()==='DELETE'){goals=goals.filter(g=>g.id!==id);await route.fulfill({status:204});return;}
   const g={...req.postDataJSON(),id};goals=goals.map(old=>old.id===id?g:old);data=g;
  }else if(url.pathname==='/api/courses')data=mine;
  else if(url.pathname==='/api/allCourses')data=courses;
  else if(url.pathname==='/api/available-enrollment'){mine=courses.filter(c=>c.id===req.postDataJSON().courseId);data={id:1};}
  else if(url.pathname==='/api/allNotices')data=[{id:1,title:'Welcome to the learning community',details:'Set your first practical goal this week.',postedBy:'Academic team',date:'2026-09-11'}];
  else if(url.pathname.startsWith('/api/allAssessments/'))data=[{id:1,description:'Write an architecture decision record.',date:'2026-10-01'}];
  else if(url.pathname==='/api/allContent')data=[{id:1,courseId:1,title:'Course repository',url:'https://github.com/example/course'}];
  else if(url.pathname==='/api/totalCourses')data=2;
  await route.fulfill({status:req.method()==='POST'&&url.pathname==='/api/me/goals'?201:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 try{
  await page.goto(origin+'/frontPage.html');await page.screenshot({path:path.join(output,'landing-desktop.png'),fullPage:true});
  await page.goto(origin+'/index.html');
  await page.locator('#username').fill('student@example.com');await page.locator('#password').fill('demo-password-123');
  await page.locator('#auth-submit').click();await page.waitForURL('**/workspace.html');
  await page.locator('#metric-active').filter({hasText:'0'}).waitFor();
  await page.locator('#new-goal').click();
  await page.locator('#goal-title').fill('Build a tested API');
  await page.locator('#goal-skill').fill('Java');
  await page.locator('#goal-description').fill('Implement and document a useful feature.');
  await page.locator('#goal-evidence').fill('https://github.com/example/portfolio');
  await page.locator('#save-goal').click();
  await page.locator('.goal h3').filter({hasText:'Build a tested API'}).waitFor();
  await page.locator('.goal select').selectOption('IN_PROGRESS');
  await page.waitForFunction(()=>document.querySelector('#metric-active').textContent==='1');
  await page.locator('.goal select').selectOption('COMPLETED');
  await page.waitForFunction(()=>document.querySelector('#metric-done').textContent==='1');
  assert.equal(await page.locator('#metric-evidence').textContent(),'1');
  await page.getByRole('button',{name:'Enroll ↗',exact:true}).first().click();
  await page.waitForFunction(()=>document.querySelector('#metric-one').textContent==='1');
  await page.reload();await page.locator('.goal h3').filter({hasText:'Build a tested API'}).waitFor();
  await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:path.join(output,'workspace-desktop.png'),fullPage:true});
  await page.getByRole('button',{name:'Course details',exact:true}).first().click();
  await page.getByText('Write an architecture decision record.').waitFor();
  await page.getByRole('link',{name:'Course repository ↗'}).waitFor();
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.locator('#course-search').fill('does-not-exist');
  assert.equal(await page.locator('.course').count(),0);
  await page.locator('#course-search').fill('');
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Delete Build a tested API'}).click();
  await page.waitForFunction(()=>document.querySelector('#metric-done').textContent==='0');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(output,'workspace-mobile.png'),fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Workspace overflows mobile viewport');
  await page.goto(origin+'/frontPage.html');await page.screenshot({path:path.join(output,'landing-mobile.png'),fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Landing overflows mobile viewport');
  await page.goto(origin+'/signup3.html');
  await page.locator('#firstName').fill('Demo');await page.locator('#lastName').fill('Student');
  await page.locator('#username').fill('new@example.com');await page.locator('#password').fill('safe-demo-password');
  await page.locator('#auth-submit').click();await page.getByRole('link',{name:'Go to sign in →'}).waitFor();
  await page.setViewportSize({width:1440,height:1000});
  for(const role of ['ADMIN','TEACHER']) {
   const roleToken='header.'+Buffer.from(JSON.stringify({sub:'demo@example.com',ROLES:[role],exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature';
   await page.evaluate(t=>localStorage.setItem('token',t),roleToken);
   await page.goto(origin+'/'+(role==='ADMIN'?'AdminDashboard.html':'TeacherDashboard.html'));
   await page.waitForFunction(()=>document.querySelector('#metric-done').textContent==='0');
   if(role==='ADMIN') await page.getByRole('link',{name:/Manage students/}).waitFor();
   else await page.getByRole('link',{name:/Create an assessment/}).waitFor();
   assert.equal(await page.getByRole('button',{name:/^Enroll /}).count(),0);
  }
  assert.deepEqual(errors,[]);
  console.log('Browser checks passed: login, signup, goal CRUD/status/persistence, enrollment, resources, search, mobile overflow. Screenshots: '+output);
 } catch(error) {console.log('PAGE ERRORS:',errors); console.log('STATUS:',await page.locator('#status').textContent());console.log('COURSES:',await page.locator('#course-list').innerText()); await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});throw error;} finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

