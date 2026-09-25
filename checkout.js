// ============================================================================
// CHHOTI BALLIA DANDIYA NIGHTS 2026 — RAZORPAY CHECKOUT & TICKET ENGINE
// ============================================================================

const RAZORPAY_CONFIG = {
    // 👇 YAHAN APNA LIVE PUBLIC KEY ID (rzp_live_...) PASTE KAREIN 👇
    KEY_ID: "rzp_live_TgJrZVsqpHWGrI",

    // ⚠️ NOTE: Apna KEY_SECRET yahan kabhi mat dalein (Frontend me uski zaroorat nahi hoti).
    // Bas Razorpay Dashboard -> Settings -> Payment Capture me "Auto-Capture" ON rakhein.
    EVENT_NAME: "Chhoti Ballia Dandiya Nights 2026",
    ORGANISER: "Dance Vibes Studio (Rahul Raj & Sahil)"
};

// State for currently selected pass
let selectedBooking = {
    passType: "Single Pass",
    unitPrice: 149,
    personsPerPass: 1,
    quantity: 1,
    fallbackUrl: "https://rzp.io/rzp/my-dandiya-book"
};

// 1. Open Booking Modal
function openBookingModal(passType, unitPrice, personsPerPass, fallbackUrl) {
    selectedBooking = {
        passType: passType,
        unitPrice: unitPrice,
        personsPerPass: personsPerPass,
        quantity: 1,
        fallbackUrl: fallbackUrl
    };

    document.getElementById("modalPassTitle").innerText = `${passType} — ₹${unitPrice}`;
    updateModalCalculation();
    document.getElementById("bookingModal").classList.remove("hidden");
}

// 2. Close Booking Modal
function closeBookingModal() {
    document.getElementById("bookingModal").classList.add("hidden");
}

// 3. Change Pass Quantity (+ / -)
function changeQuantity(delta) {
    let newQty = selectedBooking.quantity + delta;
    if (newQty < 1) newQty = 1;
    if (newQty > 25) newQty = 25; // Max 25 passes per transaction
    selectedBooking.quantity = newQty;
    updateModalCalculation();
}

// 4. Calculate Dynamic Total Amount & Allowed Persons
function updateModalCalculation() {
    const qty = selectedBooking.quantity;
    const totalAmount = selectedBooking.unitPrice * qty;
    const totalPersons = selectedBooking.personsPerPass * qty;

    document.getElementById("qtyDisplay").innerText = qty;
    document.getElementById("summaryPassName").innerText = `${selectedBooking.passType} × ${qty}`;
    document.getElementById("summaryTotalPersons").innerText = `${totalPersons} ${totalPersons > 1 ? "Persons" : "Person"}`;
    document.getElementById("summaryPassPrice").innerText = `₹${totalAmount}`;
    document.getElementById("payBtnText").innerText = `Pay Now ₹${totalAmount}`;
}

// 5. Launch Razorpay Dynamic Checkout Popup
function startRazorpayPayment(event) {
    event.preventDefault();

    const name = document.getElementById("custName").value.trim();
    const mobile = document.getElementById("custMobile").value.trim();
    const gender = document.querySelector('input[name="custGender"]:checked').value;

    const qty = selectedBooking.quantity;
    const totalAmountINR = selectedBooking.unitPrice * qty;
    const totalAmountPaise = totalAmountINR * 100; // Razorpay takes amount in paise (₹1 = 100 paise)
    const totalPersons = selectedBooking.personsPerPass * qty;

    const randomTicketId = "CBDN-" + Math.floor(100000 + Math.random() * 900000);
    const bookedAt = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

    // Prepare customer ticket object
    const pendingTicketData = {
        ticketId: randomTicketId,
        paymentId: "PENDING",
        name: name,
        mobile: mobile,
        gender: gender,
        passType: `${selectedBooking.passType} (Qty: ${qty})`,
        price: `₹${totalAmountINR}`,
        persons: `${totalPersons} ${totalPersons > 1 ? "Persons" : "Person"}`,
        quantity: qty,
        bookedAt: bookedAt
    };

    // Save in browser storage
    localStorage.setItem("dandiya_ticket_data", JSON.stringify(pendingTicketData));

    // Check if user has replaced the placeholder Key ID
    if (!RAZORPAY_CONFIG.KEY_ID || RAZORPAY_CONFIG.KEY_ID === "rzp_live_YOUR_API_KEY_HERE") {
        alert("Please add your rzp_live_... Key ID inside checkout.js first!");
        return;
    }

    // Configure Razorpay Checkout Options
    const options = {
        key: RAZORPAY_CONFIG.KEY_ID,
        amount: totalAmountPaise, // Exact dynamic amount (e.g. 29800 paise = ₹298)
        currency: "INR",
        name: RAZORPAY_CONFIG.EVENT_NAME,
        description: `${selectedBooking.passType} × ${qty} (${totalPersons} Entry)`,
        prefill: {
            name: name,
            contact: "+91" + mobile
        },
        notes: {
            ticket_id: randomTicketId,
            customer_name: name,
            mobile: mobile,
            gender: gender,
            pass_category: selectedBooking.passType,
            quantity: qty,
            allowed_persons: totalPersons
        },
        theme: {
            color: "#FF007F"
        },
        // Executes immediately when payment succeeds
        handler: function (response) {
            pendingTicketData.paymentId = response.razorpay_payment_id;
            localStorage.setItem("dandiya_ticket_data", JSON.stringify(pendingTicketData));

            // Close modal, show My Ticket button, and display VIP Ticket
            closeBookingModal();
            document.getElementById("myTicketBtn").classList.remove("hidden");
            window.history.replaceState({}, document.title, "?ticket=" + pendingTicketData.ticketId);
            renderTicketView(pendingTicketData);
        }
    };

    try {
        const rzp = new Razorpay(options);
        rzp.on("payment.failed", function (response) {
            alert("Payment Failed: " + response.error.description + "\nPlease try again.");
        });
        rzp.open();
    } catch (err) {
        // Fallback to payment link if SDK blocked by adblocker
        window.location.href = `${selectedBooking.fallbackUrl}?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(mobile)}`;
    }
}

// 6. Render VIP Digital Ticket on Screen
function renderTicketView(data) {
    document.getElementById("tktIdDisplay").innerText = "Ticket ID: #" + data.ticketId;
    document.getElementById("tktPaymentIdDisplay").innerText = "Pay ID: " + (data.paymentId || "Verified");
    document.getElementById("tktName").innerText = data.name;
    document.getElementById("tktMobile").innerText = "+91 " + data.mobile;
    document.getElementById("tktGender").innerText = data.gender;
    document.getElementById("tktPassType").innerText = data.passType;
    document.getElementById("tktPersons").innerText = data.persons;
    document.getElementById("tktPrice").innerText = data.price;
    document.getElementById("tktDateBooked").innerText = "Booked on: " + data.bookedAt;

    // Generate QR Code containing complete verified details
    const qrContent = encodeURIComponent(
        `CHHOTI BALLIA DANDIYA NIGHTS 2026\nTicket ID: ${data.ticketId}\nRazorpay ID: ${data.paymentId || "Verified"}\nName: ${data.name}\nMobile: ${data.mobile}\nGender: ${data.gender}\nPass: ${data.passType}\nEntry Allowed: ${data.persons}\nTotal Paid: ${data.price}\nStatus: CONFIRMED`
    );
    document.getElementById("tktQrCode").src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrContent}`;

    // Switch View to Ticket
    document.getElementById("mainLandingContent").classList.add("hidden");
    document.getElementById("ticketViewSection").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// 7. Show Saved Ticket from Navbar Button
function showSavedTicket() {
    const saved = localStorage.getItem("dandiya_ticket_data");
    if (saved) {
        renderTicketView(JSON.parse(saved));
    }
}

// 8. Back to Home Page
function closeTicketView() {
    document.getElementById("ticketViewSection").classList.add("hidden");
    document.getElementById("mainLandingContent").classList.remove("hidden");
    window.history.replaceState({}, document.title, window.location.pathname);
}

// 9. Download Ticket as PNG Image
function downloadTicketImage() {
    const ticketElement = document.getElementById("printableTicket");
    html2canvas(ticketElement, { scale: 2, useCORS: true, backgroundColor: "#0d021a" }).then(canvas => {
        const link = document.createElement("a");
        link.download = "Chhoti-Ballia-Dandiya-Ticket.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
}

// 10. Auto-Check on Page Load (Supports both In-Page Checkout & Redirect URL ?ticket)
window.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    const savedDataStr = localStorage.getItem("dandiya_ticket_data");

    if (savedDataStr) {
        document.getElementById("myTicketBtn").classList.remove("hidden");
    }

    const isTicketRedirect =
        urlParams.has("ticket") ||
        urlParams.has("razorpay_payment_id") ||
        hash.includes("ticket");

    if (isTicketRedirect && savedDataStr) {
        const data = JSON.parse(savedDataStr);
        if (urlParams.get("razorpay_payment_id")) {
            data.paymentId = urlParams.get("razorpay_payment_id");
            localStorage.setItem("dandiya_ticket_data", JSON.stringify(data));
        }
        renderTicketView(data);
    }
});
