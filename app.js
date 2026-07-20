let mode="signup",sb=supabase.createClient(DRIVESAATHI_CONFIG.SUPABASE_URL,DRIVESAATHI_CONFIG.SUPABASE_ANON_KEY),u=null,p=null;const $=s=>document.querySelector(s);function setMode(m){mode=m;let s=m==="signup";$("#nameLabel").classList.toggle("hidden",!s);$("#roleLabel").classList.toggle("hidden",!s);$("#authBtn").textContent=s?"Create Account":"Login"}setMode("signup");
$("#authForm").onsubmit=async e=>{e.preventDefault();let r=mode==="signup"?await sb.auth.signUp({email:$("#email").value,password:$("#password").value,options:{data:{full_name:$("#fullName").value,role:$("#role").value},emailRedirectTo:location.origin}}):await sb.auth.signInWithPassword({email:$("#email").value,password:$("#password").value});$("#authMsg").textContent=r.error?r.error.message:(mode==="signup"?"Account created. Check email if confirmation is enabled.":"Logged in.");if(!r.error)init()};
async function init(){let {data:{user}}=await sb.auth.getUser();u=user;if(!u){$("#auth").classList.remove("hidden");$("#app").classList.add("hidden");return}$("#auth").classList.add("hidden");$("#app").classList.remove("hidden");let {data}=await sb.from("profiles").select("*").eq("id",u.id).maybeSingle();p=data;let role=p?.role||u.user_metadata?.role||"customer";$("#who").textContent=u.email;$("#roleBadge").textContent=role==="driver"?"DRIVER ACCOUNT":"CUSTOMER / EMPLOYER";$("#dashTitle").textContent=role==="driver"?"Driver Dashboard":"Customer Dashboard";$("#driver").classList.toggle("hidden",role!=="driver");$("#customer").classList.toggle("hidden",role==="driver"||role==="admin");$("#adminTools").classList.toggle("hidden",role!=="admin");if(role==="driver")loadDriver();if(role==="admin"){$("#dashTitle").textContent="Admin Dashboard";$("#roleBadge").textContent="ADMIN ACCOUNT"}}init();
async function logout(){await sb.auth.signOut();u=null;init()}function closeP(){document.querySelectorAll(".sub").forEach(x=>x.classList.add("hidden"))}function openP(id){closeP();$("#"+id).classList.remove("hidden");$("#"+id).scrollIntoView({behavior:"smooth"})}function book(t){openP("bookingPanel");$("#service").value=t}
$("#bookingForm").onsubmit=async e=>{e.preventDefault();let {error}=await sb.from("bookings").insert({customer_id:u.id,service_type:$("#service").value,requirement_location:$("#location").value,requested_at:$("#requestedAt").value||null,vehicle_type:$("#vehicle").value,details:$("#bookingDetails").value});$("#bookingMsg").textContent=error?error.message:"Driver request submitted successfully.";if(!error)e.target.reset()};
$("#jobForm").onsubmit=async e=>{e.preventDefault();let {error}=await sb.from("jobs").insert({employer_id:u.id,title:$("#jobTitle").value,location:$("#jobLocation").value,salary_rate:$("#salaryRate").value,details:$("#jobDetails").value});$("#jobMsg").textContent=error?error.message:"Job posted successfully.";if(!error)e.target.reset()};
$("#driverForm").onsubmit=async e=>{e.preventDefault();let {error}=await sb.from("driver_profiles").upsert({user_id:u.id,driver_type:$("#driverType").value.toLowerCase(),licence_classes:$("#licence").value,experience_years:Number($("#exp").value||0),availability:$("#avail").value,expected_rate:$("#rate").value});$("#driverMsg").textContent=error?error.message:"Driver profile saved successfully.";if(!error)loadDriver()};
async function loadDriver(){let {data}=await sb.from("driver_profiles").select("*").eq("user_id",u.id).maybeSingle();if(!data)return;$("#licence").value=data.licence_classes||"";$("#exp").value=data.experience_years||0;$("#avail").value=data.availability||"Available Now";$("#rate").value=data.expected_rate||"";$("#verify").textContent=data.verification_status||"pending"}
async function loadJobs(){let {data,error}=await sb.from("jobs").select("*").eq("is_active",true).order("created_at",{ascending:false});$("#jobsList").innerHTML=error?error.message:(data||[]).map(j=>`<div class="item"><b>${esc(j.title)}</b><p>${esc(j.location)} · ${esc(j.salary_rate||"Rate not specified")}</p><button class="primary" onclick="applyJob('${j.id}')">Apply</button></div>`).join("")||"<p>No active jobs.</p>"}
async function applyJob(id){let {error}=await sb.from("job_applications").insert({job_id:id,driver_id:u.id});alert(error?(error.code==="23505"?"Already applied.":error.message):"Application submitted.")}
async function loadBookings(){let {data,error}=await sb.from("bookings").select("*").eq("customer_id",u.id).order("created_at",{ascending:false});if(error){$("#bookingsList").innerHTML=esc(error.message);return}$("#bookingsList").innerHTML=(data||[]).map(x=>{let q=x.quoted_amount!=null?`<p class="quote">DriveSaathi Quote: <b>₹${esc(x.quoted_amount)}</b></p>`:"";let r=x.quote_response||"";let act=(x.status==="quote_sent"&&!r)?`<div class="actions"><button class="primary" onclick="respondQuote('${x.id}','accepted')">Accept Quote</button><button class="danger" onclick="respondQuote('${x.id}','rejected')">Reject Quote</button></div>`:"";let pay=(r==="accepted"||x.status==="customer_accepted"||x.status==="payment_pending")?`<div class="paychoice"><b>Choose Payment Method</b><select id="pay_${x.id}"><option value="">Select</option><option value="upi">UPI</option><option value="card">Card</option><option value="net_banking">Net Banking</option><option value="cash">Cash / Pay after service</option></select><button onclick="savePaymentChoice('${x.id}')">Confirm Method</button><small>Test mode — no money charged.</small></div>`:"";return `<div class="item"><b>${esc(x.service_type)}</b><p>${esc(x.requirement_location)} · ${esc(x.vehicle_type||"")}</p>${q}<p>Status: <b>${esc(x.status)}</b></p>${r?`<p>Quote response: <b>${esc(r)}</b></p>`:""}${x.customer_payment_choice?`<p>Payment choice: <b>${esc(x.customer_payment_choice)}</b></p>`:""}${act}${pay}</div>`}).join("")||"<p>No requests.</p>"}
async function respondQuote(id,response){let status=response==="accepted"?"customer_accepted":"cancelled";let {error}=await sb.from("bookings").update({quote_response:response,quote_responded_at:new Date().toISOString(),status}).eq("id",id);alert(error?error.message:(response==="accepted"?"Quote accepted. Choose payment method.":"Quote rejected."));if(!error)loadBookings()}
async function savePaymentChoice(id){let method=$("#pay_"+id).value;if(!method){alert("Select a payment method.");return}let {error}=await sb.from("bookings").update({customer_payment_choice:method,payment_method:method,status:method==="cash"?"customer_accepted":"payment_pending"}).eq("id",id);alert(error?error.message:(method==="cash"?"Cash / pay-after-service selected.":"Payment method saved. Online payment is test mode."));if(!error)loadBookings()}
async function loadApps(){let {data,error}=await sb.from("job_applications").select("id,status,created_at,jobs(title,location,salary_rate)").eq("driver_id",u.id).order("created_at",{ascending:false});$("#appsList").innerHTML=error?error.message:(data||[]).map(x=>`<div class="item"><b>${esc(x.jobs?.title||"Job")}</b><p>${esc(x.jobs?.location||"")} · ${esc(x.jobs?.salary_rate||"")}</p><b>${esc(x.status)}</b></div>`).join("")||"<p>No applications.</p>"}function esc(x){return String(x||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

async function loadAdminBookings(){setTimeout(()=>injectDriverSelectors(),300);
 let {data,error}=await sb.from("bookings").select("*").order("created_at",{ascending:false});
 $("#adminBookingsList").innerHTML=error?`<p>${esc(error.message)}</p>`:(data||[]).map(b=>`<div class="item">
 <b>${esc(b.service_type)}</b><p>${esc(b.requirement_location||"")} · ${esc(b.vehicle_type||"")}</p>
 <label>Status<select id="st_${b.id}"><option>pending</option><option>quote_sent</option><option>customer_accepted</option><option>payment_pending</option><option>paid</option><option>driver_assigned</option><option>in_progress</option><option>completed</option><option>cancelled</option></select></label>
 <label>Quote / Final Price<input id="q_${b.id}" placeholder="e.g. 1200"></label>
 <label>Payment Status<select id="ps_${b.id}"><option>pending</option><option>paid</option><option>failed</option><option>refunded</option><option>cash_due</option></select></label>
 <button class="primary" onclick="saveBookingAdmin('${b.id}')">Save Update</button></div>`).join("")||"<p>No bookings.</p>";
 (data||[]).forEach(b=>{let e=$("#st_"+b.id);if(e)e.value=b.status||"pending"});
}
async function saveBookingAdmin(id){
 let payload={status:$("#st_"+id).value};
 let q=$("#q_"+id).value.trim(),ps=$("#ps_"+id).value;
 // Try extended payment fields if schema has them; gracefully fall back to status-only.
 if(q) payload.quoted_amount=Number(q);
 payload.payment_status=ps;
 let {error}=await sb.from("bookings").update(payload).eq("id",id);
 if(error && /column|schema cache/i.test(error.message)){let r=await sb.from("bookings").update({status:payload.status}).eq("id",id);error=r.error}
 alert(error?error.message:"Booking updated.");
}
async function loadAdminJobs(){
 let {data,error}=await sb.from("jobs").select("*").order("created_at",{ascending:false});
 $("#adminJobsList").innerHTML=error?esc(error.message):(data||[]).map(j=>`<div class="item"><b>${esc(j.title)}</b><p>${esc(j.location||"")} · ${esc(j.salary_rate||"")}</p><span>${j.is_active===false?"Closed":"Active"}</span></div>`).join("")||"<p>No jobs.</p>";
}
function showPayment(service,amount){
 openP("paymentPanel");$("#paySummary").textContent=`${service||"Booking"}${amount?" · Amount ₹"+amount:" · Final amount awaiting confirmation"}`;
}


async function getAssignableDrivers(){
 const r=await sb.from("driver_profiles").select("user_id,driver_type,licence_classes,experience_years,availability,expected_rate");
 if(r.error)throw r.error;
 return (r.data||[]).filter(x=>x.user_id).map(x=>({id:x.user_id,label:[x.driver_type||"Driver",x.licence_classes||"",x.experience_years!=null?x.experience_years+" yrs":"",x.availability||"",x.expected_rate||""].filter(Boolean).join(" · ")}));
}
async function injectDriverSelectors(){
 const status=$("#driverLoadStatus"); if(!status)return;
 try{
  const ds=await getAssignableDrivers();
  status.textContent="Drivers loaded: "+ds.length+(ds.length?" · "+ds.map(x=>x.label).join(" | "):"");
  document.querySelectorAll("#adminBookingsList .item").forEach(card=>{
   if(card.querySelector(".cleanAssign"))return;
   let id=(card.querySelector("button[onclick*='saveBookingAdmin']")?.getAttribute("onclick")||"").match(/'([^']+)'/)?.[1];
   if(!id)return;
   let div=document.createElement("div");div.className="cleanAssign";
   div.innerHTML=`<label>Assign Driver<select>${'<option value="">Select available driver</option>'+ds.map(d=>`<option value="${esc(d.id)}">${esc(d.label)}</option>`).join("")}</select></label><button class="primary">Assign Driver</button>`;
   div.querySelector("button").onclick=async()=>{let driverId=div.querySelector("select").value;if(!driverId){alert("Select a driver.");return}let r=await sb.from("bookings").update({assigned_driver_id:driverId,assigned_at:new Date().toISOString(),driver_response:null,status:"driver_assignment_pending"}).eq("id",id);alert(r.error?r.error.message:"Driver assigned successfully.")};
   card.appendChild(div);
  });
 }catch(e){status.textContent="Driver list error: "+(e.message||e)}
}
async function openAssignments(){
 closeP();
 $("#assignmentsPanel").classList.remove("hidden");
 const box=$("#assignmentsList");
 box.innerHTML="<p>Loading assignments...</p>";
 let r=await sb.from("bookings").select("*").eq("assigned_driver_id",u.id).order("created_at",{ascending:false});
 if(r.error){box.innerHTML=`<p>${esc(r.error.message)}</p>`;return}
 box.innerHTML=(r.data||[]).map(b=>{
   let actions="";
   if(b.completion_otp_verified===true){
     actions=`<p class="okText"><b>Trip Completed</b></p>`;
   }else if(b.driver_response==="accepted"){
     if(b.start_otp_verified===true){
       actions=`<p class="okText"><b>Trip In Progress</b></p>
         <button class="primary" onclick="requestCompletionOtp('${b.id}')">Complete Trip</button>`;
     }else{
       actions=`<p class="okText"><b>Driver Accepted</b></p>
         <button class="primary" onclick="requestStartOtp('${b.id}')">Start Trip</button>`;
     }
   }else if(b.driver_response==="rejected"){
     actions=`<p class="rejectText"><b>Job rejected</b></p>`;
   }else if(b.status==="driver_assignment_pending"){
     actions=`<div class="assignmentActions">
       <button class="primary" onclick="respondAssignment('${b.id}','accepted')">Accept Job</button>
       <button class="rejectBtn" onclick="respondAssignment('${b.id}','rejected')">Reject Job</button>
     </div>`;
   }
   return `<div class="item"><b>${esc(b.service_type||"Assignment")}</b><p>${esc(b.requirement_location||"")}</p><p>Status: <b>${esc(b.status||"")}</b></p>${actions}</div>`;
 }).join("")||"<p>No assignments.</p>";
}
async function respondAssignment(bookingId,response){
 const isAccept=response==="accepted";
 if(!confirm(isAccept?"Accept this job?":"Reject this job?"))return;
 let payload={
   driver_response:response,
   driver_responded_at:new Date().toISOString()
 };
 /* Keep booking_status enum safe: use existing driver_assignment_pending on accept/reject.
    Admin/customer can read driver_response immediately. Status transitions can be added after enum verification. */
 let r=await sb.from("bookings").update(payload).eq("id",bookingId).eq("assigned_driver_id",u.id);
 if(r.error){alert(r.error.message);return}
 alert(isAccept?"Job accepted successfully.":"Job rejected.");
 await openAssignments();
}


async function requestStartOtp(bookingId){
 const otp=String(Math.floor(1000+Math.random()*9000));
 const r=await sb.from("bookings").update({
   start_otp:otp,
   start_otp_verified:false
 }).eq("id",bookingId).eq("assigned_driver_id",u.id);
 if(r.error){alert(r.error.message);return}
 alert("Start OTP generated. Customer OTP: "+otp+" (TEST MODE)");
 const entered=prompt("Enter customer Start OTP");
 if(entered!==null) await verifyStartOtp(bookingId,entered);
}
async function verifyStartOtp(bookingId,entered){
 const q=await sb.from("bookings").select("start_otp").eq("id",bookingId).single();
 if(q.error){alert(q.error.message);return}
 if(String(entered).trim()!==String(q.data.start_otp)){alert("Invalid OTP.");return}
 const r=await sb.from("bookings").update({
   start_otp_verified:true,
   trip_started_at:new Date().toISOString()
 }).eq("id",bookingId).eq("assigned_driver_id",u.id);
 if(r.error){alert(r.error.message);return}
 alert("OTP verified. Trip started successfully.");
 await openAssignments();
}

async function requestCompletionOtp(bookingId){
 const otp=String(Math.floor(1000+Math.random()*9000));
 const r=await sb.from("bookings").update({completion_otp:otp,completion_otp_verified:false}).eq("id",bookingId).eq("assigned_driver_id",u.id);
 if(r.error){alert(r.error.message);return}
 alert("Completion OTP generated. Customer OTP: "+otp+" (TEST MODE)");
 const entered=prompt("Enter customer Completion OTP");
 if(entered!==null)await verifyCompletionOtp(bookingId,entered);
}
async function verifyCompletionOtp(bookingId,entered){
 const q=await sb.from("bookings").select("completion_otp").eq("id",bookingId).eq("assigned_driver_id",u.id).single();
 if(q.error){alert(q.error.message);return}
 if(String(entered).trim()!==String(q.data.completion_otp)){alert("Invalid completion OTP.");return}
 const r=await sb.from("bookings").update({completion_otp_verified:true,trip_completed_at:new Date().toISOString()}).eq("id",bookingId).eq("assigned_driver_id",u.id);
 if(r.error){alert(r.error.message);return}
 alert("Completion OTP verified. Trip completed successfully.");
 await openAssignments();
}


function num(v){v=parseFloat(v);return Number.isFinite(v)?v:0}
function calcPricing(id){
 const free=$("#free_"+id).checked,orig=num($("#orig_"+id).value),disc=num($("#disc_"+id).value),extra=num($("#extra_"+id).value);
 const type=$("#ctype_"+id).value,cval=num($("#cval_"+id).value);
 const finalFare=free?0:Math.max(0,orig-disc+extra);
 const commission=free?0:(type==="fixed"?Math.min(finalFare,cval):Math.min(finalFare,finalFare*cval/100));
 const payable=Math.max(0,finalFare-commission);
 $("#final_"+id).textContent="₹"+finalFare.toFixed(2);$("#comm_"+id).textContent="₹"+commission.toFixed(2);$("#payable_"+id).textContent="₹"+payable.toFixed(2);
 return {free,orig,disc,extra,type,cval,finalFare,commission,payable};
}
async function openPricing(){
 closeP();$("#pricingPanel").classList.remove("hidden");
 const box=$("#pricingList");box.innerHTML="<p>Loading bookings...</p>";
 let r=await sb.from("bookings").select("*").order("created_at",{ascending:false});
 if(r.error){box.innerHTML=esc(r.error.message);return}
 box.innerHTML=(r.data||[]).map(b=>`<div class="item pricingCard">
 <b>${esc(b.service_type||"Booking")}</b><p>${esc(b.requirement_location||"")}</p>
 <label>Original Fare ₹<input id="orig_${b.id}" type="number" min="0" value="${b.original_fare||b.quoted_amount||0}" oninput="calcPricing('${b.id}')"></label>
 <label>Discount ₹<input id="disc_${b.id}" type="number" min="0" value="${b.discount_amount||0}" oninput="calcPricing('${b.id}')"></label>
 <label>Extra Charge ₹<input id="extra_${b.id}" type="number" min="0" value="${b.extra_charge||0}" oninput="calcPricing('${b.id}')"></label>
 <label class="check"><input id="free_${b.id}" type="checkbox" ${b.is_free_service?"checked":""} onchange="calcPricing('${b.id}')"> FREE / ₹0 Service</label>
 <label>Commission Type<select id="ctype_${b.id}" onchange="calcPricing('${b.id}')"><option value="percentage" ${b.commission_type==="percentage"?"selected":""}>Percentage %</option><option value="fixed" ${b.commission_type==="fixed"?"selected":""}>Fixed ₹</option></select></label>
 <label>Commission Value<input id="cval_${b.id}" type="number" min="0" value="${b.commission_value||0}" oninput="calcPricing('${b.id}')"></label>
 <div class="calcbox">Final Fare: <b id="final_${b.id}">₹0</b> · Commission: <b id="comm_${b.id}">₹0</b> · Driver Payable: <b id="payable_${b.id}">₹0</b></div>
 <label>Amount Received ₹<input id="recv_${b.id}" type="number" min="0" value="${b.amount_received||0}"></label>
 <label>Payment Status<select id="pstat_${b.id}"><option value="pending">Pending</option><option value="paid">Paid</option><option value="partially_paid">Partially Paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option><option value="waived_free">Waived / Free</option></select></label>
 <label>Admin Notes<textarea id="pnote_${b.id}">${esc(b.payment_notes||"")}</textarea></label>
 <button class="primary" onclick="savePricing('${b.id}')">Save Pricing & Payment</button>
 </div>`).join("")||"<p>No bookings.</p>";
 (r.data||[]).forEach(b=>{let s=$("#pstat_"+b.id);if(s&&b.payment_status)s.value=b.payment_status;calcPricing(b.id)});
}
async function savePricing(id){
 const x=calcPricing(id),status=x.free?"waived_free":$("#pstat_"+id).value;
 let payload={original_fare:x.orig,discount_amount:x.disc,extra_charge:x.extra,is_free_service:x.free,final_fare:x.finalFare,commission_type:x.type,commission_value:x.cval,commission_amount:x.commission,driver_payable:x.payable,amount_received:num($("#recv_"+id).value),payment_status:status,payment_notes:$("#pnote_"+id).value,pricing_updated_at:new Date().toISOString()};
 let r=await sb.from("bookings").update(payload).eq("id",id);
 alert(r.error?r.error.message:"Pricing & payment saved successfully.");
}


function feeCalc(base,type,value,waived){if(waived)return 0;value=num(value);return type==="percentage"?Math.max(0,base*value/100):Math.max(0,value)}
function calcRevenue(id){
 let base=num($("#rbase_"+id).value);
 let cf=feeCalc(base,$("#cft_"+id).value,$("#cfv_"+id).value,$("#cfw_"+id).checked);
 let df=feeCalc(base,$("#dft_"+id).value,$("#dfv_"+id).value,$("#dfw_"+id).checked);
 $("#cfa_"+id).textContent="₹"+cf.toFixed(2);$("#dfa_"+id).textContent="₹"+df.toFixed(2);$("#trev_"+id).textContent="₹"+(cf+df).toFixed(2);
 return {base,cf,df,total:cf+df};
}
async function openRevenue(){
 closeP();$("#revenuePanel").classList.remove("hidden");let box=$("#revenueList");box.innerHTML="<p>Loading...</p>";
 let r=await sb.from("bookings").select("*").order("created_at",{ascending:false});if(r.error){box.innerHTML=esc(r.error.message);return}
 box.innerHTML=(r.data||[]).map(b=>`<div class="item revenueCard"><b>${esc(b.service_type||"Booking / Placement")}</b><p>${esc(b.requirement_location||"")}</p>
 <label>Reference Amount ₹<input id="rbase_${b.id}" type="number" value="${b.final_fare||b.quoted_amount||0}" oninput="calcRevenue('${b.id}')"></label>
 <h4>Customer / Employer Fee</h4><label>Type<select id="cft_${b.id}" onchange="calcRevenue('${b.id}')"><option value="fixed">Fixed ₹</option><option value="percentage">Percentage %</option></select></label><label>Value<input id="cfv_${b.id}" type="number" value="${b.customer_fee_value||0}" oninput="calcRevenue('${b.id}')"></label><label class="check"><input id="cfw_${b.id}" type="checkbox" ${b.customer_fee_waived?"checked":""} onchange="calcRevenue('${b.id}')"> FREE / Waive fee</label><p>Fee: <b id="cfa_${b.id}">₹0</b></p>
 <label>Customer Fee Status<select id="cfs_${b.id}"><option value="pending">Pending</option><option value="paid">Paid</option><option value="waived">Waived</option></select></label>
 <h4>Driver / Job Seeker Fee</h4><label>Type<select id="dft_${b.id}" onchange="calcRevenue('${b.id}')"><option value="fixed">Fixed ₹</option><option value="percentage">Percentage %</option></select></label><label>Value<input id="dfv_${b.id}" type="number" value="${b.driver_fee_value||0}" oninput="calcRevenue('${b.id}')"></label><label class="check"><input id="dfw_${b.id}" type="checkbox" ${b.driver_fee_waived?"checked":""} onchange="calcRevenue('${b.id}')"> FREE / Waive fee</label><p>Fee: <b id="dfa_${b.id}">₹0</b></p>
 <label>Driver Fee Status<select id="dfs_${b.id}"><option value="pending">Pending</option><option value="paid">Paid</option><option value="waived">Waived</option></select></label>
 <div class="calcbox">Total DriveSaathi Revenue: <b id="trev_${b.id}">₹0</b></div>
 <label>Connection Status<select id="conn_${b.id}"><option value="not_connected">Not Connected</option><option value="matched">Matched</option><option value="connected">Connected</option><option value="closed">Placement / Service Closed</option></select></label>
 <button class="primary" onclick="saveRevenue('${b.id}')">Save Revenue & Connection</button></div>`).join("")||"<p>No records.</p>";
 (r.data||[]).forEach(b=>{for(let [id,val] of [["cft_",b.customer_fee_type],["dft_",b.driver_fee_type],["cfs_",b.customer_fee_status],["dfs_",b.driver_fee_status],["conn_",b.connection_status]]){let x=$("#"+id+b.id);if(x&&val)x.value=val}calcRevenue(b.id)});
}
async function saveRevenue(id){
 let x=calcRevenue(id),conn=$("#conn_"+id).value,now=new Date().toISOString();
 let p={customer_fee_type:$("#cft_"+id).value,customer_fee_value:num($("#cfv_"+id).value),customer_fee_amount:x.cf,customer_fee_waived:$("#cfw_"+id).checked,customer_fee_status:$("#cfs_"+id).value,driver_fee_type:$("#dft_"+id).value,driver_fee_value:num($("#dfv_"+id).value),driver_fee_amount:x.df,driver_fee_waived:$("#dfw_"+id).checked,driver_fee_status:$("#dfs_"+id).value,total_platform_revenue:x.total,connection_status:conn};
 if(conn==="connected")p.connected_at=now;if(conn==="closed")p.placement_closed_at=now;
 let r=await sb.from("bookings").update(p).eq("id",id);alert(r.error?r.error.message:"Dual commission & revenue saved successfully.");
}




function flowLabel(f){return f==="job_placement"?"Permanent Job / Placement":"Trip / Temporary / Hourly Service"}
async function openWorkflow(){
 closeP();$("#workflowPanel").classList.remove("hidden");let box=$("#workflowList");box.innerHTML="<p>Loading...</p>";
 let r=await sb.from("bookings").select("*").order("created_at",{ascending:false});if(r.error){box.innerHTML=esc(r.error.message);return}
 box.innerHTML=(r.data||[]).map(b=>`<div class="item workflowCard">
 <b>${esc(b.service_type||"Request")}</b><p>${esc(b.requirement_location||"")}</p>
 <label><b>Business Flow</b><select id="flow_${b.id}" onchange="renderFlowControls('${b.id}')">
 <option value="trip_service" ${b.business_flow!=="job_placement"?"selected":""}>Trip / Temporary / Hourly Service</option>
 <option value="job_placement" ${b.business_flow==="job_placement"?"selected":""}>Permanent Job / Placement</option></select></label>
 <div id="fc_${b.id}"></div></div>`).join("")||"<p>No requests.</p>";
 (r.data||[]).forEach(b=>renderFlowControls(b.id,b));
}
async function renderFlowControls(id,b=null){
 if(!b){let r=await sb.from("bookings").select("*").eq("id",id).single();if(r.error)return;b=r.data}
 let flow=$("#flow_"+id).value,box=$("#fc_"+id);
 if(flow==="job_placement"){
  box.innerHTML=`<div class="flowSteps"><b>Placement Flow</b><p>Requirement → Match/Select → Fees → Contact Unlock → Connected → Close</p>
  <label>Match Status<select id="ms_${id}"><option value="not_matched">Not Matched</option><option value="matched">Matched</option><option value="selected">Driver Selected</option></select></label>
  <label>Selected Driver ID (optional)<input id="sd_${id}" value="${b.selected_driver_id||""}" placeholder="Select/match driver in assignment module"></label>
  <label class="check"><input id="cu_${id}" type="checkbox" ${b.contact_unlocked?"checked":""}> Contact Unlocked</label>
  <label>Placement Status<select id="ps_${id}"><option value="open">Open</option><option value="in_process">In Process</option><option value="connected">Connected</option><option value="closed">Placement Closed</option><option value="cancelled">Cancelled</option></select></label>
  <label>Notes<textarea id="pn_${id}">${esc(b.placement_notes||"")}</textarea></label>
  <button class="primary" onclick="saveFlow('${id}')">Save Job / Placement Flow</button></div>`;
  if(b.match_status)$("#ms_"+id).value=b.match_status;if(b.placement_status)$("#ps_"+id).value=b.placement_status;
 }else{
  box.innerHTML=`<div class="flowSteps"><b>Trip / Service Flow</b><p>Quote → Payment → Assign Driver → Accept → Start OTP → Complete OTP → Settlement</p>
  <p>Current status: <b>${esc(b.status||"")}</b></p>
  <p>${b.completion_otp_verified?"✅ Trip completion verified":b.start_otp_verified?"🟡 Trip start verified":"Awaiting next trip action"}</p>
  <button class="primary" onclick="saveFlow('${id}')">Save as Trip / Service</button></div>`;
 }
}
async function saveFlow(id){
 let flow=$("#flow_"+id).value,p={business_flow:flow};
 if(flow==="job_placement"){
  p.match_status=$("#ms_"+id).value;p.contact_unlocked=$("#cu_"+id).checked;p.placement_status=$("#ps_"+id).value;p.placement_notes=$("#pn_"+id).value;
  let sd=$("#sd_"+id).value.trim(); if(sd)p.selected_driver_id=sd;
  if(p.contact_unlocked)p.contact_unlocked_at=new Date().toISOString();if(p.placement_status==="closed")p.placement_closed_at=new Date().toISOString();
 }
 let r=await sb.from("bookings").update(p).eq("id",id);
 alert(r.error?r.error.message:"Business flow saved successfully.");
 if(!r.error)openWorkflow();
}


async function refreshNotificationBadge(){
 try{
  let r=await sb.from("notifications").select("id",{count:"exact",head:true}).eq("recipient_role","admin").eq("is_read",false);
  let b=$("#notifBadge"); if(b)b.textContent=r.error?"!":String(r.count||0);
 }catch(e){}
}
async function openNotifications(){
 closeP();$("#notificationsPanel").classList.remove("hidden");await loadNotifications();
}
async function loadNotifications(){
 let box=$("#notificationsList");box.innerHTML="<p>Loading notifications...</p>";
 let r=await sb.from("notifications").select("*").eq("recipient_role","admin").order("created_at",{ascending:false}).limit(100);
 if(r.error){box.innerHTML=`<div class="item"><b>Cannot load notifications</b><p>${esc(r.error.message)}</p><p class="hint">If RLS blocks access, add the secure Admin policy in Supabase before production.</p></div>`;return}
 box.innerHTML=(r.data||[]).map(n=>`<div class="item notificationItem ${n.is_read?"read":"unread"}">
 <div class="notifHead"><b>${n.priority==="high"?"🔴 ":""}${esc(n.title||"Notification")}</b><span>${n.is_read?"Read":"NEW"}</span></div>
 <p>${esc(n.message||"")}</p><small>${esc(n.notification_type||"general")} · ${new Date(n.created_at).toLocaleString()}</small>
 ${n.is_read?"":`<button onclick="markNotificationRead('${n.id}')">Mark as Read</button>`}</div>`).join("")||"<p>No notifications yet. New app events will appear here.</p>";
 await refreshNotificationBadge();
}
async function markNotificationRead(id){
 let r=await sb.from("notifications").update({is_read:true,read_at:new Date().toISOString()}).eq("id",id);
 if(r.error){alert(r.error.message);return} await loadNotifications();
}
async function markAllNotificationsRead(){
 let r=await sb.from("notifications").update({is_read:true,read_at:new Date().toISOString()}).eq("recipient_role","admin").eq("is_read",false);
 if(r.error){alert(r.error.message);return} await loadNotifications();
}
setTimeout(refreshNotificationBadge,1200);
setInterval(refreshNotificationBadge,30000);

function openPublishVacancy(id){closeP();$("#pvBookingId").value=id;$("#pvTitle").value="Driver Required";$("#pvSalary").value="";$("#pvDetails").value="";$("#publishVacancyPanel").classList.remove("hidden")}
async function publishVacancyNow(){const id=$("#pvBookingId").value,title=$("#pvTitle").value.trim(),salary=$("#pvSalary").value.trim(),details=$("#pvDetails").value.trim();if(!id||!title){alert("Booking and Job Title are required.");return}const {error}=await sb.rpc("publish_booking_as_job",{p_booking_id:id,p_title:title,p_salary_rate:salary,p_details:details});if(error){alert(error.message);return}alert("Vacancy published successfully. Driver can now see it in Find Jobs.");closeP()}



function enhancePermanentBookingCards(){
  // Booking cards in this build do not consistently expose data-booking-id,
  // so match rendered cards to the booking data already loaded by the app.
  const candidates=[...document.querySelectorAll(".item, .booking-card, .card, #bookingsList > div")];
  candidates.forEach(card=>{
    if(card.dataset.permanentEnhanced==="1") return;
    const text=(card.innerText||"").trim();
    const low=text.toLowerCase();
    if(!low.includes("permanent")) return;

    // Find matching booking by visible location/service text.
    let booking=null;
    if(typeof window.bookings!=="undefined" && Array.isArray(window.bookings)){
      booking=window.bookings.find(b=>{
        const loc=String(b.requirement_location||"").toLowerCase();
        return String(b.service_type||"").toLowerCase().includes("permanent") && (!loc || low.includes(loc));
      });
    }
    // Also inspect common global arrays if present.
    if(!booking){
      for(const key of ["allBookings","adminBookings","bookingsData"]){
        const arr=window[key];
        if(Array.isArray(arr)){
          booking=arr.find(b=>String(b.service_type||"").toLowerCase().includes("permanent") &&
            (!b.requirement_location || low.includes(String(b.requirement_location).toLowerCase())));
          if(booking) break;
        }
      }
    }
    // Last resort: use a UUID embedded in card markup/attributes.
    let id=booking?.id || card.dataset.bookingId || card.getAttribute("data-id");
    if(!id){
      const m=card.outerHTML.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
      if(m) id=m[0];
    }
    if(!id) return;

    card.dataset.permanentEnhanced="1";
    const wrap=document.createElement("div");
    wrap.className="permanentVacancyFlow";
    wrap.innerHTML=`<h3>Permanent Driver Hiring</h3>
      <p class="hint">Publish this requirement to Driver → Find Jobs. Applications can then be reviewed before selecting a driver.</p>
      <button class="primary publishVacancyBtn">Publish as Vacancy</button>`;
    wrap.querySelector("button").onclick=()=>openDetailedPublishVacancy(booking?.id || id);
    card.appendChild(wrap);
  });
}
setInterval(enhancePermanentBookingCards,700);

async function openDetailedPublishVacancy(id){
 closeP();$("#pvBookingId").value=id;
 let r=await sb.from("bookings").select("*").eq("id",id).single();
 let b=r.data||{};
 alert("ID: "+id+"\nERROR: "+(r.error?.message||"NONE")+"\nDATA: "+JSON.stringify(r.data));
 $("#pvTitle").value=b.job_title||"Driver Required";$("#pvSalary").value="";
 $("#pvVehicle").value=b.vehicle_type||"";$("#pvSalaryMin").value=b.salary_min||"";$("#pvSalaryMax").value=b.salary_max||"";
 $("#pvDutyType").value=b.duty_type||"Full-time";$("#pvDutyHours").value=b.duty_hours||"";$("#pvShift").value=b.shift_type||"Day";
 $("#pvExperience").value=b.experience_required||"";$("#pvLicence").value=b.licence_required||"";$("#pvWeeklyOff").value=b.weekly_off||"";
 $("#pvJoining").value=b.joining_date||"";$("#pvFood").checked=!!b.food_provided;$("#pvAccommodation").checked=!!b.accommodation_provided;
 $("#pvOutstation").checked=!!b.outstation_required;$("#pvNight").checked=!!b.night_driving_required;
 $("#pvDetails").value=b.job_description||"";$("#pvSpecial").value=b.special_requirements||"";
 $("#publishVacancyPanel").classList.remove("hidden");
}
openPublishVacancy=openDetailedPublishVacancy;

publishVacancyNow=async function(){
 const id=$("#pvBookingId").value,title=$("#pvTitle").value.trim();
 alert("Booking ID sent: " + id);
 if(!id||!title){alert("Booking and Job Title are required.");return}
 const min=Number($("#pvSalaryMin").value||0),max=Number($("#pvSalaryMax").value||0);
 if(min&&max&&max<min){alert("Salary Max cannot be less than Salary Min.");return}
 const detail={
  job_title:title,salary_min:min,salary_max:max,duty_type:$("#pvDutyType").value,duty_hours:$("#pvDutyHours").value.trim(),
  shift_type:$("#pvShift").value,experience_required:$("#pvExperience").value.trim(),licence_required:$("#pvLicence").value.trim(),
  weekly_off:$("#pvWeeklyOff").value.trim(),food_provided:$("#pvFood").checked,accommodation_provided:$("#pvAccommodation").checked,
  outstation_required:$("#pvOutstation").checked,night_driving_required:$("#pvNight").checked,joining_date:$("#pvJoining").value||null,
  job_description:$("#pvDetails").value.trim(),special_requirements:$("#pvSpecial").value.trim()
 };
 let u=await sb.from("bookings").update(detail).eq("id",id);if(u.error){alert(u.error.message);return}
 const salary=(min||max)?("₹"+(min||0)+" - ₹"+(max||0)+" / month"):$("#pvSalary").value.trim();
 let rpc=await sb.rpc("publish_booking_as_job",{p_booking_id:id,p_title:title,p_salary_rate:salary,p_details:detail.job_description});
 if(rpc.error){alert(rpc.error.message);return}
 const jobId=rpc.data;
 let ju=await sb.from("jobs").update({
  vehicle_type:$("#pvVehicle").value.trim(),duty_type:detail.duty_type,duty_hours:detail.duty_hours,shift_type:detail.shift_type,
  experience_required:detail.experience_required,licence_required:detail.licence_required,weekly_off:detail.weekly_off,
  food_provided:detail.food_provided,accommodation_provided:detail.accommodation_provided,outstation_required:detail.outstation_required,
  night_driving_required:detail.night_driving_required,joining_date:detail.joining_date,special_requirements:detail.special_requirements
 }).eq("id",jobId);
 if(ju.error){alert("Vacancy published, but extra details could not be saved: "+ju.error.message);return}
 alert("Detailed vacancy published successfully. Driver can view full job details before applying.");closeP();
}

async function enhanceDriverJobDetails(){
 const cards=[...document.querySelectorAll(".item,.job-card")];
 if(!cards.length)return;
 let r=await sb.from("jobs").select("*").eq("is_active",true).order("created_at",{ascending:false});if(r.error)return;
 cards.forEach(card=>{
  if(card.dataset.jobDetailed==="1")return;
  const txt=(card.innerText||"").toLowerCase();
  let b=(r.data||[]).find(x=>txt.includes(String(x.title||"").toLowerCase()) && (!x.location||txt.includes(String(x.location).toLowerCase())));
  if(!b)return; card.dataset.jobDetailed="1";
  const d=document.createElement("div");d.className="driverJobDetails";
  d.innerHTML=`<p><b>Vehicle:</b> ${esc(b.vehicle_type||"Not specified")}</p><p><b>Duty:</b> ${esc(b.duty_type||"Not specified")} · ${esc(b.duty_hours||"Hours not specified")} · ${esc(b.shift_type||"Shift not specified")}</p><p><b>Experience:</b> ${esc(b.experience_required||"Not specified")} · <b>Licence:</b> ${esc(b.licence_required||"Not specified")}</p><p><b>Weekly Off:</b> ${esc(b.weekly_off||"Not specified")}</p><p><b>Benefits:</b> ${b.food_provided?"Food ":""}${b.accommodation_provided?"Accommodation ":""}${!b.food_provided&&!b.accommodation_provided?"Not specified":""}</p><p><b>Outstation:</b> ${b.outstation_required?"Yes":"No"} · <b>Night Driving:</b> ${b.night_driving_required?"Yes":"No"}</p><p><b>Joining:</b> ${esc(b.joining_date||"Not specified")}</p><p><b>Special Requirements:</b> ${esc(b.special_requirements||"None specified")}</p><p class="privacyNote">Employer private contact details are protected until selection/payment rules allow contact unlock.</p>`;
  card.appendChild(d);
 });
}
setInterval(enhanceDriverJobDetails,1500);
