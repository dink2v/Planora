const $ = (selector) => document.querySelector(selector);
const taskList = $("#task-list");
const dialog = $("#task-dialog");
const form = $("#task-form");
const dateNow = new Date();
let shownMonth = new Date(dateNow.getFullYear(), dateNow.getMonth(), 1);
const dateKey = (date) => [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
const initialTasks = [
 {title:"Review pekerjaan",date:dateKey(dateNow),time:"09:00",category:"Pekerjaan",priority:"medium",done:false},
 {title:"Cek agenda minggu ini",date:dateKey(dateNow),time:"10:30",category:"Pribadi",priority:"low",done:true},
 {title:"Belanja kebutuhan",date:dateKey(dateNow),time:"16:00",category:"Pribadi",priority:"high",done:false}
];
let tasks = initialTasks;
try { const saved = localStorage.getItem("planora-demo-tasks"); if(saved) tasks = JSON.parse(saved); } catch(e) {}
const save = () => { try { localStorage.setItem("planora-demo-tasks",JSON.stringify(tasks)); } catch(e) {} };
const priorityLabel = {low:"Rendah",medium:"Sedang",high:"Tinggi"};
const categoryClass = (category) => category==="Pekerjaan"?"blue-dot":category==="Belajar"?"purple-dot":"green-dot";
const displayTime = (time) => time || "Waktu belum ditentukan";
function renderTasks(){
 const today = dateKey(dateNow);
 const todayTasks = tasks.filter(t=>t.date===today).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
 $("#today-count").textContent=todayTasks.length;
 $("#done-count").textContent=todayTasks.filter(t=>t.done).length;
 $("#overdue-count").textContent=tasks.filter(t=>!t.done&&t.date<today).length;
 taskList.innerHTML="";
 if(!todayTasks.length){taskList.innerHTML='<p class="empty-state">Belum ada rencana hari ini. Tambahkan rencana baru untuk memulai.</p>';return;}
 todayTasks.forEach((task)=>{
  const row=document.createElement("article");row.className="task-row";
  const check=document.createElement("button");check.className="task-check"+(task.done?" checked":"");check.setAttribute("aria-label",task.done?"Tandai belum selesai":"Tandai selesai");check.textContent=task.done?"✓":"";
  check.addEventListener("click",()=>{task.done=!task.done;save();renderTasks();renderCalendar();});
  const info=document.createElement("div");info.className="task-info";
  const title=document.createElement("strong");title.textContent=task.title;if(task.done)title.className="completed";
  const meta=document.createElement("span");meta.textContent=displayTime(task.time)+" · ";
  const dot=document.createElement("i");dot.className="dot "+categoryClass(task.category);meta.append(dot,document.createTextNode(task.category||"Lainnya"));
  info.append(title,meta);
  const priority=document.createElement("span");priority.className="priority "+(task.priority||"medium");priority.textContent=priorityLabel[task.priority]||"Sedang";
  row.append(check,info,priority);taskList.append(row);
 });
}
function renderCalendar(){
 const year=shownMonth.getFullYear(),month=shownMonth.getMonth();
 $("#month-label").textContent=shownMonth.toLocaleDateString("id-ID",{month:"long",year:"numeric"});
 const grid=$("#calendar-grid");grid.innerHTML="";
 ["Min","Sen","Sel","Rab","Kam","Jum","Sab"].forEach(day=>{const el=document.createElement("span");el.className="weekday";el.textContent=day;grid.append(el);});
 const firstDay=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate();
 for(let i=0;i<firstDay;i++){const blank=document.createElement("span");blank.textContent="";grid.append(blank);}
 for(let day=1;day<=days;day++){
  const date=new Date(year,month,day),el=document.createElement("span");el.textContent=day;
  if(dateKey(date)===dateKey(dateNow))el.classList.add("today");
  if(tasks.some(t=>t.date===dateKey(date)))el.classList.add("has-plan");
  grid.append(el);
 }
}
function openDialog(){form.reset();form.elements.date.value=dateKey(dateNow);form.elements.time.value="09:00";dialog.showModal();}
$("#open-task-form").addEventListener("click",openDialog);
$("#add-inline").addEventListener("click",openDialog);
$("#close-dialog").addEventListener("click",()=>dialog.close());
$("#cancel-dialog").addEventListener("click",()=>dialog.close());
$("#prev-month").addEventListener("click",()=>{shownMonth=new Date(shownMonth.getFullYear(),shownMonth.getMonth()-1,1);renderCalendar();});
$("#next-month").addEventListener("click",()=>{shownMonth=new Date(shownMonth.getFullYear(),shownMonth.getMonth()+1,1);renderCalendar();});
form.addEventListener("submit",(event)=>{
 event.preventDefault();const data=new FormData(form);
 tasks.push({title:String(data.get("title")).trim(),date:String(data.get("date")),time:String(data.get("time")),category:String(data.get("category")),priority:String(data.get("priority")),done:false});
 save();renderTasks();renderCalendar();dialog.close();
});
$("#today-date").textContent=dateNow.toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).toUpperCase();
renderTasks();renderCalendar();
