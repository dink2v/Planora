"use strict";
(() => {
  const $ = (s) => document.querySelector(s);
  const KEY = "planora-demo-tasks";
  const list = $("#task-manager-list");
  const dialog = $("#manager-dialog");
  const form = $("#manager-form");
  let editingId = null;
  let tasks = readTasks();

  const MONTHS_KEY = "planora-demo-month-columns";
  let monthColumns = readMonthColumns();
  const collapsedMonths = new Set();
  const monthDialog = $("#month-dialog");
  const monthForm = $("#month-form");
  function monthKey(date) { return String(date || "").slice(0,7); }
  function monthTitle(key) { const parts=key.split("-"); if(parts.length!==2)return key; const d=new Date(Number(parts[0]),Number(parts[1])-1,1); return d.toLocaleDateString("id-ID",{month:"long",year:"numeric"}); }
  function readMonthColumns() {
    try { const raw=localStorage.getItem(MONTHS_KEY); const saved=raw?JSON.parse(raw):[]; const keys=Array.isArray(saved)?saved.filter(k=>/^\d{4}-\d{2}$/.test(k)):[]; const current=monthKey(todayKey()); return [...new Set([current,...keys])].sort(); }
    catch(e){return [monthKey(todayKey())];}
  }
  function saveMonthColumns(){try{localStorage.setItem(MONTHS_KEY,JSON.stringify(monthColumns));}catch(e){notice("Kolom bulan tidak bisa disimpan di browser ini.");}}
  function renderMonthBoard() {
    const board=$("#month-board"); if(!board)return; board.replaceChildren();
    const keys=[...new Set([...monthColumns,...tasks.map(t=>monthKey(t.date)).filter(k=>/^\d{4}-\d{2}$/.test(k))])].sort();
    keys.forEach(key=>{
      const column=document.createElement("section");column.className="month-column";column.dataset.month=key;
      const details=document.createElement("details");details.open=!collapsedMonths.has(key);
      details.addEventListener("toggle",()=>{if(details.open)collapsedMonths.delete(key);else collapsedMonths.add(key);});
      const summary=document.createElement("summary");summary.className="month-column-summary";
      const title=document.createElement("strong");title.textContent=monthTitle(key);
      const count=document.createElement("span");count.className="month-count";count.textContent=tasks.filter(t=>monthKey(t.date)===key).length;
      summary.append(title,count);details.append(summary);
      const cards=document.createElement("div");cards.className="month-cards";
      tasks.filter(t=>monthKey(t.date)===key).sort((a,b)=>(a.date+(a.time||"")).localeCompare(b.date+(b.time||""))).forEach(t=>{
        const card=document.createElement("article");card.className="month-task-card"+(t.done?" is-done":"");
        const check=makeButton(t.done?"✓":"","month-task-check"+(t.done?" checked":""),()=>{t.done=!t.done;save();render();},t.done?"Tandai belum selesai":"Tandai selesai");
        const open=makeButton(t.title,"month-task-open",()=>openEditor(t),"Buka tugas "+t.title);
        const meta=document.createElement("small");const day=new Date(t.date+"T12:00:00").toLocaleDateString("id-ID",{weekday:"short",day:"numeric"});meta.textContent=day+(t.time?" · "+t.time:"")+" · "+(t.category||"Lainnya");
        const top=document.createElement("div");top.className="month-task-top";top.append(check,open);
        card.append(top,meta);cards.append(card);
      });
      if(!cards.children.length){const empty=document.createElement("p");empty.className="month-column-empty";empty.textContent="Belum ada tugas di bulan ini.";cards.append(empty);}
      const add=makeButton("＋ Tambah tugas","month-add-task",()=>openEditor(null,key),"Tambah tugas di "+monthTitle(key));
      details.append(cards,add);column.append(details);board.append(column);
    });
    board.append(makeButton("＋ Tambah Bulan","month-add-card",addMonth,"Tambah kolom bulan"));
  }
  function openMonthDialog(){
    const next=new Date();next.setMonth(next.getMonth()+1);
    monthForm.elements.month.value=String(next.getFullYear())+"-"+String(next.getMonth()+1).padStart(2,"0");
    if(monthDialog.showModal)monthDialog.showModal();else notice("Gunakan browser terbaru untuk menambah kolom bulan.");
  }
  function addMonth(key){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)){notice("Pilih bulan yang valid.");return false;}
    if(monthColumns.includes(key)){notice("Kolom "+monthTitle(key)+" sudah ada.");return false;}
    monthColumns.push(key);monthColumns.sort();saveMonthColumns();renderMonthBoard();
    const newColumn=$("#month-board").querySelector('[data-month="'+key+'"]');
    if(newColumn)newColumn.scrollIntoView({behavior:"smooth",block:"nearest",inline:"nearest"});
    notice("Kolom "+monthTitle(key)+" ditambahkan.");return true;
  }
  function todayKey() {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
  }
  function valid(t) { return t && typeof t.title === "string" && t.title.trim() && typeof t.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.date); }
  function readTasks() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) {
        const today = todayKey();
        return [
          {id:"demo-1",title:"Review pekerjaan",date:today,time:"09:00",category:"Pekerjaan",priority:"medium",done:false},
          {id:"demo-2",title:"Cek agenda minggu ini",date:today,time:"10:30",category:"Pribadi",priority:"low",done:true},
          {id:"demo-3",title:"Belanja kebutuhan",date:today,time:"16:00",category:"Pribadi",priority:"high",done:false}
        ];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(valid).map((t,i)=>({
        id:t.id || "task-"+i,title:t.title.trim(),date:t.date,time:typeof t.time==="string"?t.time:"",
        category:typeof t.category==="string"?t.category:"Lainnya",
        priority:["low","medium","high"].includes(t.priority)?t.priority:"medium",done:Boolean(t.done)
      })) : [];
    } catch (e) { console.warn("Planora: gagal membaca tugas lokal",e); return []; }
  }
  function save() {
    try { localStorage.setItem(KEY,JSON.stringify(tasks)); return true; }
    catch(e) { notice("Gagal menyimpan. Periksa penyimpanan browser atau mode privat."); return false; }
  }
  function notice(message) {
    let n=$("#manager-notice");
    if(!n){n=document.createElement("p");n.id="manager-notice";n.className="notice";n.setAttribute("role","status");$(".page-heading").insertAdjacentElement("afterend",n);}
    n.textContent=message;
  }
  const priorityLabel={low:"Rendah",medium:"Sedang",high:"Tinggi"};
  function fmtDate(value) {
    const d=new Date(value+"T12:00:00");
    return d.toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});
  }
  function filtered() {
    const query=$("#task-search").value.trim().toLocaleLowerCase("id");
    const filter=$("#task-filter").value;
    const sort=$("#task-sort").value;
    let result=tasks.filter(t=>t.title.toLocaleLowerCase("id").includes(query)||String(t.category||"").toLocaleLowerCase("id").includes(query));
    if(filter==="open") result=result.filter(t=>!t.done);
    if(filter==="done") result=result.filter(t=>t.done);
    if(filter==="overdue") result=result.filter(t=>!t.done&&t.date<todayKey());
    if(sort==="priority") {const rank={high:0,medium:1,low:2};result.sort((a,b)=>rank[a.priority]-rank[b.priority]||a.date.localeCompare(b.date));}
    else if(sort==="created") result.sort((a,b)=>String(b.id).localeCompare(String(a.id)));
    else result.sort((a,b)=>(a.date+(a.time||"99:99")).localeCompare(b.date+(b.time||"99:99")));
    return result;
  }
  function makeButton(label,className,action,aria) {
    const b=document.createElement("button");b.type="button";b.className=className;b.textContent=label;b.setAttribute("aria-label",aria||label);b.addEventListener("click",action);return b;
  }
  function render() {
    $("#stat-all").textContent=tasks.length;
    $("#stat-open").textContent=tasks.filter(t=>!t.done).length;
    $("#stat-done").textContent=tasks.filter(t=>t.done).length;
    renderMonthBoard();
    list.replaceChildren();
    const shown=filtered();
    if(!shown.length){const empty=document.createElement("div");empty.className="empty-state task-empty";empty.textContent=tasks.length?"Tidak ada tugas yang cocok dengan pencarian atau filter.":"Belum ada tugas. Tekan Tambah Tugas untuk membuat rencana pertamamu.";list.append(empty);return;}
    shown.forEach(t=>{
      const row=document.createElement("article");row.className="manager-row"+(t.done?" is-done":"");
      const taskCell=document.createElement("div");taskCell.className="manager-task-cell";
      const check=makeButton(t.done?"✓":"","task-check"+(t.done?" checked":""),()=>{t.done=!t.done;save();render();},t.done?"Tandai belum selesai":"Tandai selesai");check.setAttribute("aria-pressed",String(t.done));
      const text=document.createElement("div");text.className="manager-task-text";
      const title=document.createElement("strong");title.textContent=t.title;
      const meta=document.createElement("small");meta.textContent=(t.time?t.time+" · ":"")+ (t.category||"Lainnya");
      text.append(title,meta);taskCell.append(check,text);
      const date=document.createElement("div");date.className="manager-date";date.textContent=fmtDate(t.date);
      const priority=document.createElement("div");const badge=document.createElement("span");badge.className="priority "+t.priority;badge.textContent=priorityLabel[t.priority]||"Sedang";priority.append(badge);
      const actions=document.createElement("div");actions.className="manager-actions";
      actions.append(makeButton("Edit","action-button",()=>openEditor(t),"Edit "+t.title),makeButton("Hapus","action-button danger",()=>removeTask(t),"Hapus "+t.title));
      row.append(taskCell,date,priority,actions);list.append(row);
    });
  }
  function openEditor(task=null, month=null) {
    editingId=task?task.id:null;form.reset();
    $("#manager-dialog-title").textContent=task?"Edit Tugas":"Tambah Tugas";
    $("#manager-save").textContent=task?"Simpan Perubahan":"Simpan Tugas";
    form.elements.title.value=task?task.title:"";
    form.elements.date.value=task?task.date:(month?month+"-01":todayKey());
    form.elements.time.value=task?task.time||"":"09:00";
    form.elements.category.value=task?task.category||"Lainnya":"Pekerjaan";
    form.elements.priority.value=task?task.priority||"medium":"medium";
    if(dialog.showModal)dialog.showModal();else notice("Browser ini tidak mendukung dialog. Buka Planora di browser terbaru.");
  }
  function removeTask(task) {
    if(!window.confirm('Hapus tugas "'+task.title+'"? Tugas yang dihapus tidak dapat dipulihkan.'))return;
    tasks=tasks.filter(t=>t.id!==task.id);save();render();notice("Tugas berhasil dihapus.");
  }
  $("#task-add").addEventListener("click",()=>openEditor());
  $("#month-add").addEventListener("click",openMonthDialog);
  $("#month-close").addEventListener("click",()=>monthDialog.close());
  $("#month-cancel").addEventListener("click",()=>monthDialog.close());
  monthForm.addEventListener("submit",e=>{e.preventDefault();const key=String(monthForm.elements.month.value||"");if(!key)return;if(addMonth(key))monthDialog.close();});
  $("#manager-close").addEventListener("click",()=>dialog.close());
  $("#manager-cancel").addEventListener("click",()=>dialog.close());
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const data=new FormData(form);const title=String(data.get("title")||"").trim();const date=String(data.get("date")||"");
    if(!title||!valid({title,date})){notice("Nama tugas dan tanggal wajib diisi dengan benar.");return;}
    const next={title,date,time:String(data.get("time")||""),category:String(data.get("category")||"Lainnya"),priority:["low","medium","high"].includes(String(data.get("priority")))?String(data.get("priority")):"medium"};
    if(editingId){const old=tasks.find(t=>t.id===editingId);if(old)Object.assign(old,next);}
    else tasks.push({id:"task-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),...next,done:false});
    save();render();dialog.close();notice(editingId?"Perubahan tugas disimpan.":"Tugas berhasil ditambahkan.");editingId=null;
  });
  ["task-search","task-filter","task-sort"].forEach(id=>$("#"+id).addEventListener(id==="task-search"?"input":"change",render));
  document.querySelectorAll("[data-feature]").forEach(link=>link.addEventListener("click",e=>{e.preventDefault();notice("Halaman "+(link.dataset.feature||"fitur")+" akan dibuat sebagai fitur tersendiri.");}));
  $(".profile").addEventListener("click",()=>notice("Profil pengguna akan ditambahkan setelah fitur akun dibuat."));
  $("#task-page-date").textContent=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).toUpperCase();
  render();
})();