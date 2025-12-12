const SERVICE_LIST=[{id:"cut",name:"ตัดผม",price:250},{id:"color",name:"ทำสี",price:1200},{id:"treat",name:"ทรีตเมนต์",price:890}];
const popup=document.getElementById("bookingPopup");
const popupTimes=document.getElementById("popupTimes");
const popupServices=document.getElementById("popupServices");
const popupConfirm=document.getElementById("popupConfirm");
const popupClose=document.getElementById("popupClose");

function openPopup(dateStr){
 popup.classList.add("show");
 document.body.style.overflow="hidden";
 loadPopupTimes();
 loadPopupServices();
}

function loadPopupTimes(){
 popupTimes.innerHTML="";
 ["10:00","11:00","12:00"].forEach(t=>{
   const b=document.createElement("div");
   b.className="time-btn";
   b.textContent=t;
   b.onclick=()=>{document.querySelectorAll(".time-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");};
   popupTimes.appendChild(b);
 });
}

function loadPopupServices(){
 popupServices.innerHTML="";
 SERVICE_LIST.forEach(s=>{
   const b=document.createElement("div");
   b.className="service-btn";
   b.textContent=`${s.name} — ${s.price}฿`;
   b.onclick=()=>{document.querySelectorAll(".service-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");};
   popupServices.appendChild(b);
 });
}

popupClose.onclick=()=>{popup.classList.remove("show");document.body.style.overflow="";};

// auto-open popup for demo
setTimeout(()=>openPopup("2025-12-12"),500);
