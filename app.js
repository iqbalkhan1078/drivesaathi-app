let mode="signup",sb=supabase.createClient(DRIVESAATHI_CONFIG.SUPABASE_URL,DRIVESAATHI_CONFIG.SUPABASE_ANON_KEY),u=null,p=null;const $=s=>document.querySelector(s);function setMode(m){mode=m;let s=m==="signup";$("#signupExtra")?.classList.toggle("hidden",!s);$("#authBtn").textContent=s?"Create Account":"Login"}setMode("signup");
$("#authForm").onsubmit=async e=>{e.preventDefault();const msg=$("#authMsg");if(mode==="signup"){const mobile=($("#mobile")?.value||"").replace(/\D/g,"");if(mobile.length<10){msg.textContent="Please enter a valid mobile number.";return}if(!$("#fullName").value.trim()||!$("#signupAddress").value.trim()||!$("#signupCity").value.trim()||!$("#signupPin").value.trim()){msg.textContent="Please complete name, address, city and PIN code.";return}if(!$("#email").value.trim()){msg.textContent="Email is currently required for secure login/recovery until SMS OTP is configured.";return}let r=await sb.auth.signUp({email:$("#email").value,password:$("#password").value,options:{data:{full_name:$("#fullName").value,role:$("#role").value,mobile,address:$("#signupAddress").value,city:$("#signupCity").value,pin_code:$("#signupPin").value},emailRedirectTo:location.origin}});msg.textContent=r.error?r.error.message:"Account created. Check email if confirmation is enabled.";if(!r.error)init()}else{if(!$("#email").value.trim()){msg.textContent="Enter your registered email.";return}let r=await sb.auth.signInWithPassword({email:$("#email").value,password:$("#password").value});msg.textContent=r.error?r.error.message:"Logged in.";if(!r.error)init()}};async function forgotPassword(){const email=($("#email")?.value||"").trim();if(!email){$("#authMsg").textContent="Enter your registered email first, then tap Forgot Password.";return}let r=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin});$("#authMsg").textContent=r.error?r.error.message:"Password reset link sent. Check your email."}
async function init(){let {data:{user}}=await sb.auth.getUser();u=user;if(!u){$("#auth").classList.remove("hidden");$("#app").classList.add("hidden");return}$("#auth").classList.add("hidden");$("#app").classList.remove("hidden");let {data}=await sb.from("profiles").select("*").eq("id",u.id).maybeSingle();p=data;let role=p?.role||u.user_metadata?.role||"customer";$("#who").textContent=u.email||u.phone||"Signed in";$("#roleBadge").textContent=role==="admin"?"SUPER ADMIN":role==="employee"?"EMPLOYEE":role==="driver"?"DRIVER ACCOUNT":"CUSTOMER / EMPLOYER";$("#dashTitle").textContent=role==="admin"?"Admin Dashboard":role==="employee"?"Employee Dashboard":role==="driver"?"Driver Dashboard":"Customer Dashboard";$("#driver").classList.toggle("hidden",role!=="driver");$("#customer").classList.toggle("hidden",role!=="customer");$("#adminTools").classList.toggle("hidden",role!=="admin");if(role==="driver")loadDriver();if(role==="admin")loadSupportPendingCount();const f=$("#supportFab");if(f)f.classList.toggle("hidden",role==="admin");}init();
async function logout(){await sb.auth.signOut();u=null;init()}function closeP(){document.querySelectorAll(".sub").forEach(x=>x.classList.add("hidden"))}function openP(id){closeP();$("#"+id).classList.remove("hidden");window.scrollTo(0,0)}function book(t){openP("bookingPanel");$("#service").value=t}
$("#bookingForm").onsubmit=async e=>{e.preventDefault();let {error}=await sb.from("bookings").insert({customer_id:u.id,service_type:$("#service").value,requirement_location:$("#location").value,requested_at:$("#requestedAt").value||null,vehicle_type:$("#vehicle").value,details:$("#bookingDetails").value});$("#bookingMsg").textContent=error?error.message:"Driver request submitted successfully.";if(!error)e.target.reset()};
$("#jobForm").onsubmit=async e=>{e.preventDefault();let {error}=await sb.from("jobs").insert({employer_id:u.id,title:$("#jobTitle").value,location:$("#jobLocation").value,salary_rate:$("#salaryRate").value,details:$("#jobDetails").value});$("#jobMsg").textContent=error?error.message:"Job posted successfully.";if(!error)e.target.reset()};

async function saveDriverProfile(e){
  e.preventDefault();

  const jobPreferences = [...document.querySelectorAll('input[name="jobPreference"]:checked')]
    .map(x => x.value);

  const selfieFile = document.getElementById("driverSelfie")?.files[0];
  let selfieUrl = null;

  if(selfieFile){
    const ext = selfieFile.name.split(".").pop();
    const selfiePath = `${u.id}/selfie-${Date.now()}.${ext}`;

    const {error: uploadError} = await sb.storage
      .from("driver-kyc-documents")
      .upload(selfiePath, selfieFile, {upsert:true});

    if(uploadError){
      alert("Selfie upload failed: " + uploadError.message);
      return;
    }

    selfieUrl = selfiePath;
  }

  const profileData = {
    user_id: u.id,
    first_name: document.getElementById("firstName")?.value || "",
    middle_name: document.getElementById("middleName")?.value || "",
    last_name: document.getElementById("lastName")?.value || "",
    current_address: document.getElementById("currentAddress")?.value || "",
    permanent_address: document.getElementById("permanentAddress")?.value || "",
    driver_type: document.getElementById("driverType")?.value?.toLowerCase() || "",
    licence_classes: document.getElementById("licence")?.value || "",
    experience_years: Number(document.getElementById("exp")?.value || 0),
    availability: document.getElementById("avail")?.value || "",
    expected_rate: document.getElementById("rate")?.value || "",
    job_preferences: jobPreferences,
    profile_verification_status: "pending"
  };

  if(selfieUrl) profileData.selfie_url = selfieUrl;

  const {error} = await sb
    .from("driver_profiles")
    .upsert(profileData);

  if(error){
    alert("Profile save failed: " + error.message);
    return;
  }

  alert("Driver profile submitted for Admin Verification");
  await loadDriver();
}
async function loadDriver(){
  let {data}=await sb.from("driver_profiles").select("*").eq("user_id",u.id).maybeSingle();
  if(!data)return;
  const set=(id,v)=>{const el=$(id);if(el)el.value=v??""};
  set("#firstName",data.first_name);set("#middleName",data.middle_name);set("#lastName",data.last_name);
  set("#currentAddress",data.current_address);set("#permanentAddress",data.permanent_address);
  set("#driverType",data.driver_type?data.driver_type.charAt(0).toUpperCase()+data.driver_type.slice(1):"Personal");
  set("#licence",data.licence_classes);set("#exp",data.experience_years||0);set("#avail",data.availability||"Available Now");set("#rate",data.expected_rate);
  document.querySelectorAll('input[name="jobPreference"]').forEach(x=>x.checked=(data.job_preferences||[]).includes(x.value));
  if($("#verify")) $("#verify").textContent=data.verification_status||"pending";
  if($("#kycStatus")) $("#kycStatus").textContent=data.verification_status||"pending";
}
async function submitDriverKYC(){
  const msg=document.getElementById("kycMsg");
  try{
    const {data:{user},error:userError}=await sb.auth.getUser();
    if(userError||!user){alert("Please login first");return}
    const files={
      aadhaar:document.getElementById("kycAadhaar")?.files[0],
      pan:document.getElementById("kycPan")?.files[0],
      licence:document.getElementById("kycLicence")?.files[0],
      address:document.getElementById("kycAddress")?.files[0],
      experience:document.getElementById("kycExperience")?.files[0]
    };
    const {data:existing,error:listError}=await sb.storage.from("driver-kyc-documents").list(user.id);
    if(listError) throw listError;
    const required=["aadhaar","pan","licence","address"];
    const missing=required.filter(type=>!files[type]&&!(existing||[]).some(f=>f.name.startsWith(type+"-")));
    if(missing.length){
      msg.textContent="Please upload missing documents: "+missing.join(", ");return;
    }
    const selected=Object.entries(files).filter(([,file])=>file);
    if(!selected.length){msg.textContent="No new document selected. Existing KYC documents are already saved.";return}
    msg.textContent="Uploading selected documents...";
    for(const [type,file] of selected){
      const ext=(file.name.split(".").pop()||"bin").toLowerCase();
      const path=`${user.id}/${type}-${Date.now()}.${ext}`;
      const {error}=await sb.storage.from("driver-kyc-documents").upload(path,file,{upsert:false});
      if(error) throw error;
    }
    await sb.from("driver_profiles").update({verification_status:"pending"}).eq("user_id",user.id);
    document.getElementById("kycStatus").textContent="Submitted / Pending Verification";
    if(document.getElementById("verify"))document.getElementById("verify").textContent="pending";
    msg.textContent="KYC documents saved successfully. Existing documents were kept.";
    ["kycAadhaar","kycPan","kycLicence","kycAddress","kycExperience"].forEach(id=>{const el=document.getElementById(id);if(el)el.value=""});
  }catch(err){console.error(err);msg.textContent="Upload failed: "+err.message}
}

async function loadBookings(){let {data,error}=await sb.from("bookings").select("*").eq("customer_id",u.id).order("created_at",{ascending:false});if(error){$("#bookingsList").innerHTML=esc(error.message);return}$("#bookingsList").innerHTML=(data||[]).map(x=>{let q=x.quoted_amount!=null?`<p class="quote">DriveSaathi Quote: <b>₹${esc(x.quoted_amount)}</b></p>`:"";let r=x.quote_response||"";let act=(x.status==="quote_sent"&&!r)?`<div class="actions"><button class="primary" onclick="respondQuote('${x.id}','accepted')">Accept Quote</button><button class="danger" onclick="respondQuote('${x.id}','rejected')">Reject Quote</button></div>`:"";let pay=(r==="accepted"||x.status==="customer_accepted"||x.status==="payment_pending")?`<div class="paychoice"><b>Choose Payment Method</b><select id="pay_${x.id}"><option value="">Select</option><option value="upi">UPI</option><option value="card">Card</option><option value="net_banking">Net Banking</option><option value="cash">Cash / Pay after service</option></select><button onclick="savePaymentChoice('${x.id}')">Confirm Method</button><small>Test mode — no money charged.</small></div>`:"";return `<div class="item"><b>${esc(x.service_type)}</b><p>${esc(x.requirement_location)} · ${esc(x.vehicle_type||"")}</p>${q}<p>Status: <b>${esc(x.status)}</b></p>${r?`<p>Quote response: <b>${esc(r)}</b></p>`:""}${x.customer_payment_choice?`<p>Payment choice: <b>${esc(x.customer_payment_choice)}</b></p>`:""}${act}${pay}</div>`}).join("")||"<p>No requests.</p>"}
async function respondQuote(id,response){let status=response==="accepted"?"customer_accepted":"cancelled";let {error}=await sb.from("bookings").update({quote_response:response,quote_responded_at:new Date().toISOString(),status}).eq("id",id);alert(error?error.message:(response==="accepted"?"Quote accepted. Choose payment method.":"Quote rejected."));if(!error)loadBookings()}
async function savePaymentChoice(id){let method=$("#pay_"+id).value;if(!method){alert("Select a payment method.");return}let {error}=await sb.from("bookings").update({customer_payment_choice:method,payment_method:method,status:method==="cash"?"customer_accepted":"payment_pending"}).eq("id",id);alert(error?error.message:(method==="cash"?"Cash / pay-after-service selected.":"Payment method saved. Online payment is test mode."));if(!error)loadBookings()}
async function loadApps(){
  let {data,error}=await sb
    .from("job_applications")
    .select("id,status,created_at,jobs(title,location,salary_rate)")
    .eq("driver_id",u.id)
    .order("created_at",{ascending:false});

  $("#appsList").innerHTML=error
    ? esc(error.message)
    : (data||[]).map(x=>{
        let statusMessage="";

        if(x.status==="selected"){
          statusMessage=`
            <div style="margin-top:12px;padding:14px;border:1px solid #ddd;border-radius:10px;">
              <b>🎉 Congratulations! You have been selected for this job.</b>
              <p>Your application has been successfully selected by the employer.</p>
            </div>`;
        }else if(x.status==="rejected"){
          statusMessage=`<p><b>Application Status:</b> Rejected</p>`;
        }else{
          statusMessage=`<p><b>Application Status:</b> ${esc(x.status)}</p>`;
        }

        return `
          <div class="item">
            <b>${esc(x.jobs?.title||"Job")}</b>
            <p>${esc(x.jobs?.location||"")} · ${esc(x.jobs?.salary_rate||"")}</p>
            ${statusMessage}
          </div>`;
      }).join("") || "<p>No applications.</p>";
}
function esc(x){
  return String(x||"").replace(/[&<>"']/g,m=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[m]));
}
async function loadAdminBookings(){setTimeout(()=>injectDriverSelectors(),300);
 let {data,error}=await sb.from("bookings").select("*").order("created_at",{ascending:false});
 $("#adminBookingsList").innerHTML=error?`<p>${esc(error.message)}</p>`:(data||[]).map(b=>`<div class="item" data-booking-id="${b.id}">
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
  let {data:jobs,error}=await sb
    .from("jobs")
    .select("*")
    .order("created_at",{ascending:false});

  if(error){
    $("#adminJobsList").innerHTML=`<p>${esc(error.message)}</p>`;
    return;
  }

  let {data:apps,error:appError}=await sb
    .from("job_applications")
    .select("*")
    .order("created_at",{ascending:false});

  if(appError){
    console.error("Application load error:",appError);
    apps=[];
  }
const driverIds=[...new Set((apps||[]).map(a=>a.driver_id).filter(Boolean))];
let driverProfiles=[];

if(driverIds.length){
  const {data:dpData,error:dpError}=await sb
    .from("driver_profiles")
    .select("*")
    .in("user_id",driverIds);

  if(!dpError) driverProfiles=dpData||[];
}
  $("#adminJobsList").innerHTML=(jobs||[]).map(j=>{
    const jobApps=(apps||[]).filter(a=>a.job_id===j.id);

    const applications=jobApps.length
      ? jobApps.map(a=>{ const dp=driverProfiles.find(d=>d.user_id===a.driver_id)||{}; return `
        <div class="item" style="margin-top:10px">
          <b>Driver Application</b>
          <p>Status: ${esc(a.status||"applied")}</p>
          <p>Driver ID: ${esc(a.driver_id||"")}</p>
          <p><b>Profile:</b> ${esc(dp.driver_type||"Not specified")} · Licence: ${esc(dp.licence_classes||"Not specified")} · Experience: ${esc(dp.experience_years??"Not specified")} years · Availability: ${esc(dp.availability||"Not specified")} · Expected Rate: ${esc(dp.expected_rate||"Not specified")}</p>
 <p><b>KYC Status:</b> ${esc(dp.verification_status||"pending")}</p>
          ${a.status === "applied" || a.status === "shortlisted" ? `
  <button class="primary"
    onclick="updateJobApplication('${a.id}','selected')">
    Accept / Select Driver
  </button>

  <button
    onclick="updateJobApplication('${a.id}','rejected')">
    Reject
  </button>
` : `
  <p><b>Application Status:</b> ${esc(a.status)}</p>
`}
        </div>
      `}).join("")
      : `<p>No applications yet.</p>`;

    return `
      <div class="item">
        <b>${esc(j.title)}</b>
        <p>${esc(j.location||"")} · ${esc(j.salary_rate||"")}</p>
        <span>${j.is_active===false?"Closed":"Active"}</span>

        <div style="margin-top:12px">
          <b>Applications (${jobApps.length})</b>
          ${applications}
        </div>
      </div>
    `;
  }).join("")||"<p>No jobs.</p>";
}
async function loadAdminDriverProfiles(){
  const box=document.getElementById("adminDriverProfilesList");if(!box)return;box.innerHTML="<p>Loading driver profiles...</p>";
  const {data,error}=await sb.from("driver_profiles").select("*").order("created_at",{ascending:false});
  if(error){box.innerHTML="<p>Unable to load profiles: "+esc(error.message)+"</p>";return}
  box.innerHTML=(data||[]).map(d=>{
    const full=[d.first_name,d.middle_name,d.last_name].filter(Boolean).join(" ")||"Name not provided";
    const prefs=(d.job_preferences||[]).map(x=>x.replaceAll("_"," ")).join(", ")||"Not selected";
    return `<div class="item profileReview"><div class="profileReviewHead"><div><b>${esc(full)}</b><p>Profile status: <b>${esc(d.profile_verification_status||"pending")}</b> · KYC: <b>${esc(d.verification_status||"pending")}</b></p></div><button onclick="viewDriverSelfie('${d.user_id}')">View Selfie</button></div>
    <p><b>Current Address:</b> ${esc(d.current_address||"Not provided")}</p><p><b>Permanent Address:</b> ${esc(d.permanent_address||"Not provided")}</p>
    <p><b>Job Preferences:</b> ${esc(prefs)}</p><p><b>Driver:</b> ${esc(d.driver_type||"-")} · <b>Licence:</b> ${esc(d.licence_classes||"-")} · <b>Experience:</b> ${esc(d.experience_years??0)} years</p>
    <p><b>Availability:</b> ${esc(d.availability||"-")} · <b>Expected Rate:</b> ${esc(d.expected_rate||"-")}</p>
    <div class="actions"><button class="primary" onclick="updateDriverProfileStatus('${d.user_id}','approved')">Approve Profile</button><button class="danger" onclick="updateDriverProfileStatus('${d.user_id}','rejected')">Reject Profile</button></div></div>`
  }).join("")||"<p>No driver profiles found.</p>";
}
async function updateDriverProfileStatus(userId,status){
  if(!confirm((status==="approved"?"Approve":"Reject")+" this driver profile?"))return;
  const {error}=await sb.from("driver_profiles").update({profile_verification_status:status}).eq("user_id",userId);
  alert(error?error.message:(status==="approved"?"Driver profile approved.":"Driver profile rejected."));if(!error)loadAdminDriverProfiles();
}
async function viewDriverSelfie(userId){
  try{const {data:row,error:rerr}=await sb.from("driver_profiles").select("selfie_url").eq("user_id",userId).maybeSingle();if(rerr)throw rerr;if(!row?.selfie_url){alert("Selfie not found.");return}
  const {data,error}=await sb.storage.from("driver-kyc-documents").createSignedUrl(row.selfie_url,300);if(error)throw error;window.open(data.signedUrl,"_blank");}catch(err){alert("Unable to open selfie: "+err.message)}
}

async function loadAdminKYC(){
  const box = document.getElementById("adminKycList");
  if(!box) return;

  box.innerHTML = "<p>Loading KYC submissions...</p>";

  try{
    const {data:profiles,error} = await sb
      .from("driver_profiles")
      .select("*")
      .order("created_at",{ascending:false});

    if(error) throw error;

    if(!profiles || !profiles.length){
      box.innerHTML = "<p>No driver KYC submissions found.</p>";
      return;
    }

    box.innerHTML = profiles.map(d => `
      <div class="item" style="margin-bottom:16px">
        <b>Driver ID:</b> ${esc(d.user_id || "")}<br>
        <b>Licence:</b> ${esc(d.licence_classes || "")}<br>
        <b>Experience:</b> ${esc(d.experience_years || "0")} years<br>
        <b>Status:</b> ${esc(d.verification_status || "pending")}
        <div style="margin-top:10px;margin-bottom:10px">
  <button type="button" onclick="viewKycDoc('${d.user_id}','aadhaar')">View Aadhaar</button>
  <button type="button" onclick="viewKycDoc('${d.user_id}','pan')">View PAN</button>
  <button type="button" onclick="viewKycDoc('${d.user_id}','licence')">View Licence</button>
  <button type="button" onclick="viewKycDoc('${d.user_id}','address')">View Address Proof</button>
  <button type="button" onclick="viewKycDoc('${d.user_id}','experience')">View Experience Proof</button>
</div>

        <div style="margin-top:10px">
          <button class="primary"
            onclick="updateDriverKYC('${d.user_id}','approved')">
            Approve
          </button>

          <button
            onclick="updateDriverKYC('${d.user_id}','rejected')">
            Reject
          </button>
        </div>
      </div>
    `).join("");

  }catch(err){
    console.error("KYC load error:",err);
    box.innerHTML =
      "<p>Unable to load KYC: "+esc(err.message || "Unknown error")+"</p>";
  }
}

async function updateDriverKYC(userId,status){
  const msg = status === "approved"
    ? "Approve this driver's KYC?"
    : "Reject this driver's KYC?";

  if(!confirm(msg)) return;

  const {error} = await sb
    .from("driver_profiles")
    .update({verification_status:status})
    .eq("user_id",userId);

  if(error){
    alert("KYC update failed: "+error.message);
    return;
  }

  alert(
    status === "approved"
      ? "Driver KYC approved successfully."
      : "Driver KYC rejected."
  );

  await loadAdminKYC();
}

async function viewKycDoc(userId,type){
  try{
    const {data:files,error}=await sb.storage
      .from("driver-kyc-documents")
      .list(userId);

    if(error) throw error;

    const file=(files||[])
      .filter(f=>f.name.startsWith(type+"-"))
      .sort((a,b)=>b.name.localeCompare(a.name))[0];

    if(!file){
      alert(type+" document not found.");
      return;
    }

    const path=userId+"/"+file.name;

    const {data,error:signError}=await sb.storage
      .from("driver-kyc-documents")
      .createSignedUrl(path,300);

    if(signError) throw signError;

    window.open(data.signedUrl,"_blank");
  }catch(err){
    console.error("KYC document error:",err);
    alert("Unable to open document: "+err.message);
  }
}

async function updateJobApplication(applicationId,status){
  if(!confirm(
    status==="accepted"
      ?"Do you want to select this driver?"
      :"Do you want to reject this application?"
  )) return;

  const {error}=await sb
    .from("job_applications")
    .update({status:status})
    .eq("id",applicationId);

  if(error){
    alert("Error: "+error.message);
    return;
  }

  alert(
    status==="selected"
      ?"Driver selected successfully."
      :"Application rejected."
  );

  await loadAdminJobs();
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
    let id=card.dataset.bookingId || booking?.id || card.getAttribute("data-id");
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

// ===== Batch 3: DriveSaathi Help Center =====
const HELP_KB={
 kyc:"KYC ke liye Aadhaar, PAN, Driving Licence aur Address Proof submit karein. Existing uploaded documents dobara select karna zaroori nahi. Status Admin verification ke baad update hota hai.",
 booking:"Customer Dashboard se required service select karke location, date/time, vehicle aur details submit karein. Request My Requests me track hogi.",
 jobs:"Driver Find Jobs me vacancies dekhkar apply kar sakta hai. Application ka status My Applications me dikhega.",
 payment:"Quote/price Admin workflow ke through confirm hota hai. Test build me real online payment charge nahi hota.",
 profile:"Driver Profile me name, addresses, selfie, job preferences, driver type, licence, experience, availability aur expected rate save karein.",
 assignment:"Admin driver assign karta hai. Driver My Assignments me Accept/Reject kar sakta hai; accepted trip me Start aur Completion workflow available hai."
};
function openHelp(){openP("helpPanel");loadMyHelpQueries()}
function askHelp(k){if($("#helpQuestion"))$("#helpQuestion").value=k;$("#helpAnswer").textContent=HELP_KB[k]||"Please submit your query to Admin Support."}
function searchHelpAnswer(){const q=($("#helpQuestion")?.value||"").toLowerCase();let key=Object.keys(HELP_KB).find(k=>q.includes(k));if(!key){if(/aadhaar|pan|licen|document|verify/.test(q))key="kyc";else if(/request|hire|driver booking/.test(q))key="booking";else if(/job|application|vacan/.test(q))key="jobs";else if(/pay|price|fare|commission|money/.test(q))key="payment";else if(/profile|selfie|address/.test(q))key="profile";else if(/trip|assign|otp|accept|reject/.test(q))key="assignment"}$("#helpAnswer").textContent=key?HELP_KB[key]:"Is sawal ka exact automatic answer available nahi hai. Neeche query submit karein; Admin Support reply karega."}
async function submitHelpQuery(){const msg=$("#helpMsg"),text=($("#helpQuery")?.value||"").trim();if(!text){msg.textContent="Please write your query.";return}let role=p?.role||u?.user_metadata?.role||"customer";let r=await sb.from("support_queries").insert({user_id:u.id,user_role:role,category:$("#helpCategory").value,query:text,status:"open"});msg.textContent=r.error?("Unable to submit: "+r.error.message):"Query submitted to DriveSaathi Admin Support.";if(!r.error){$("#helpQuery").value="";loadMyHelpQueries()}}
async function loadMyHelpQueries(){const box=$("#myHelpQueries");if(!box||!u)return;box.innerHTML="<p>Loading...</p>";let r=await sb.from("support_queries").select("*").eq("user_id",u.id).order("created_at",{ascending:false});box.innerHTML=r.error?`<p>${esc(r.error.message)}</p>`:(r.data||[]).map(x=>`<div class="item helpLog"><b>${esc(x.category||"General")}</b><p>${esc(x.query)}</p><p>Status: <b>${esc(x.status||"open")}</b></p>${x.admin_reply?`<div class="helpAnswer"><b>DriveSaathi Support:</b><br>${esc(x.admin_reply)}</div>`:"<p>Awaiting Admin reply.</p>"}</div>`).join("")||"<p>No support queries yet.</p>"}
async function loadAdminHelpQueries(){const box=$("#adminHelpQueries");if(!box)return;box.innerHTML="<p>Loading...</p>";let r=await sb.from("support_queries").select("*").order("created_at",{ascending:false});box.innerHTML=r.error?`<p>${esc(r.error.message)}</p>`:(r.data||[]).map(x=>`<div class="item helpLog"><b>${esc(x.user_role||"user")} · ${esc(x.category||"General")}</b><p>${esc(x.query)}</p><p>User: ${esc(x.user_id)}</p><p>Status: <b>${esc(x.status||"open")}</b></p><label>Admin Reply<textarea id="hr_${x.id}">${esc(x.admin_reply||"")}</textarea></label><label>Status<select id="hs_${x.id}"><option value="open">Open</option><option value="in_progress">In Progress</option><option value="answered">Answered</option><option value="closed">Closed</option></select></label><button class="primary" onclick="replyHelpQuery('${x.id}')">Save Reply</button></div>`).join("")||"<p>No support queries.</p>";(r.data||[]).forEach(x=>{let e=$("#hs_"+x.id);if(e)e.value=x.status||"open"})}
async function replyHelpQuery(id){let r=await sb.from("support_queries").update({admin_reply:$("#hr_"+id).value,status:$("#hs_"+id).value,answered_at:new Date().toISOString()}).eq("id",id);alert(r.error?r.error.message:"Support reply saved.");if(!r.error)loadAdminHelpQueries()}
setTimeout(()=>{const f=$("#supportFab");if(f&&u)f.classList.remove("hidden")},1200);
function openAdminSupport(){openP("adminHelpPanel");loadAdminHelpQueries()}
async function loadSupportPendingCount(){const b=$("#supportPendingBadge");if(!b)return;let r=await sb.from("support_queries").select("id",{count:"exact",head:true}).in("status",["open","pending","in_progress"]);b.textContent=r.error?"!":String(r.count||0)}

/* ===== DriveSaathi Batch 5: Jobs + Plans + Employee RBAC UI ===== */
async function loadJobs(){
  const box=$("#jobsList"); box.innerHTML="<p>Loading available jobs...</p>";
  const {data,error}=await sb.from("jobs").select("*").order("created_at",{ascending:false});
  if(error){box.innerHTML=`<p>${esc(error.message)}</p>`;return}
  const {data:mine}=await sb.from("job_applications").select("job_id").eq("driver_id",u.id);
  const applied=new Set((mine||[]).map(x=>x.job_id));
  box.innerHTML=(data||[]).map(j=>`<div class="item jobCard"><b>${esc(j.title||"Driver Requirement")}</b><p>📍 ${esc(j.location||"")}</p><p><b>Rate:</b> ${esc(j.salary_rate||"Contact / To be decided")}</p><p>${esc(j.details||"")}</p>${applied.has(j.id)?'<p class="okText">✓ Applied</p>':`<button class="primary" onclick="applyToJob('${j.id}')">Apply for Job</button>`}</div>`).join("")||"<p>No active jobs available right now.</p>";
}
async function applyToJob(jobId){
 const {error}=await sb.from("job_applications").insert({job_id:jobId,driver_id:u.id,status:"applied"});
 alert(error?(error.code==="23505"?"You already applied for this job.":error.message):"Application submitted successfully."); if(!error)loadJobs();
}
async function loadPlansAdmin(){
 const box=$("#plansList"); box.innerHTML='<p>Loading plans...</p>';
 const {data,error}=await sb.from("subscription_plans").select("*").order("audience").order("validity_days");
 if(error){box.innerHTML=`<p>${esc(error.message)}</p>`;return}
 box.innerHTML=`<div class="planEditor"><h3>Create Plan</h3><div class="jobGrid"><label>For<select id="planAudience"><option value="driver">Driver</option><option value="customer">Customer</option></select></label><label>Plan Name<input id="planName" placeholder="Monthly Premium"></label><label>Price ₹<input id="planPrice" type="number" min="0"></label><label>Validity<select id="planDays"><option value="30">Monthly (30 days)</option><option value="180">6 Months (180 days)</option><option value="365">Yearly (365 days)</option></select></label></div><label>Benefits (one per line)<textarea id="planBenefits" placeholder="Unlimited job applications\nPriority support"></textarea></label><button class="primary" onclick="createPlanAdmin()">Create Plan</button></div><hr>`+(data||[]).map(x=>`<div class="item"><b>${esc(x.audience.toUpperCase())} · ${esc(x.name)}</b><p>₹${Number(x.price||0).toFixed(0)} · ${x.validity_days} days · ${x.is_active?'Active':'Inactive'}</p><div class="actions"><button onclick="editPlanAdmin('${x.id}',${Number(x.price||0)},${x.validity_days})">Edit Price/Validity</button><button onclick="togglePlanAdmin('${x.id}',${!x.is_active})">${x.is_active?'Deactivate':'Activate'}</button></div></div>`).join("");
}
async function createPlanAdmin(){const benefits=($("#planBenefits").value||"").split("\n").map(x=>x.trim()).filter(Boolean);const payload={audience:$("#planAudience").value,name:$("#planName").value.trim(),price:Number($("#planPrice").value||0),validity_days:Number($("#planDays").value),benefits};if(!payload.name){alert("Plan name required");return}const {error}=await sb.from("subscription_plans").insert(payload);alert(error?error.message:"Plan created.");if(!error)loadPlansAdmin()}
async function editPlanAdmin(id,price,days){const np=prompt("New price ₹",price);if(np===null)return;const nd=prompt("Validity days (30 / 180 / 365)",days);if(nd===null)return;const {error}=await sb.from("subscription_plans").update({price:Number(np),validity_days:Number(nd)}).eq("id",id);alert(error?error.message:"Plan updated.");if(!error)loadPlansAdmin()}
async function togglePlanAdmin(id,on){const {error}=await sb.from("subscription_plans").update({is_active:on}).eq("id",id);alert(error?error.message:"Plan status updated.");if(!error)loadPlansAdmin()}
async function loadEmployeeAdmin(){const box=$("#employeeList");box.innerHTML='<p>Loading employees...</p>';const {data,error}=await sb.from("profiles").select("id,full_name,email,mobile,role").eq("role","employee");if(error){box.innerHTML=`<p>${esc(error.message)}</p>`;return}box.innerHTML='<p class="hint">Employee account invite/create will use secure Admin server function. Here you can manage permissions for existing employee accounts.</p>'+((data||[]).map(e=>`<div class="item"><b>${esc(e.full_name||e.email||e.id)}</b><p>${esc(e.mobile||"")} ${esc(e.email||"")}</p><button class="primary" onclick="manageEmployeePermissions('${e.id}')">Manage Permissions</button><div id="perm_${e.id}"></div></div>`).join('')||'<p>No employee accounts yet.</p>')}
async function manageEmployeePermissions(id){const keys=['support.manage','kyc.review','bookings.manage','jobs.manage','payments.view','plans.manage','reports.view'];const {data}=await sb.from('employee_permissions').select('permission_key').eq('employee_id',id);const has=new Set((data||[]).map(x=>x.permission_key));const box=$("#perm_"+id);box.innerHTML='<div class="checks">'+keys.map(k=>`<label><input type="checkbox" ${has.has(k)?'checked':''} onchange="setEmployeePermission('${id}','${k}',this.checked)"> ${esc(k)}</label>`).join('')+'</div>'}
async function setEmployeePermission(id,key,on){let r=on?await sb.from('employee_permissions').upsert({employee_id:id,permission_key:key,granted_by:u.id},{onConflict:'employee_id,permission_key'}):await sb.from('employee_permissions').delete().eq('employee_id',id).eq('permission_key',key);if(r.error)alert(r.error.message)}
async function loadMyPlans(){const role=p?.role||u?.user_metadata?.role||'customer';const {data,error}=await sb.from('subscription_plans').select('*').eq('audience',role).eq('is_active',true).order('validity_days');const box=$("#myPlansList");if(!box)return;box.innerHTML=error?`<p>${esc(error.message)}</p>`:(data||[]).map(x=>`<div class="item"><b>⭐ ${esc(x.name)}</b><p>₹${Number(x.price||0).toFixed(0)} · ${x.validity_days} days</p><p>${Array.isArray(x.benefits)?x.benefits.map(esc).join(' · '):''}</p><button class="primary" onclick="alert('Payment gateway activation will be connected after merchant onboarding. No charge made now.')">Choose Plan</button></div>`).join('')||'<p>Free access is active. No paid plan is currently enabled.</p>'}
