"""AI Marketing Sequence Generator & Single Email Studio — MailPilot AI."""
import csv
import io
import json
import os
import urllib.request
import urllib.error

import streamlit as st
from dotenv import load_dotenv
from generator import ai_sequence, demo_sequence, gemini_sequence, gemini_single_email

load_dotenv()
st.set_page_config(page_title="AI Email & Sequence Generator — MailPilot", page_icon="✉️", layout="centered")

gemini_key = os.getenv("GEMINI_API_KEY", "")
openai_key = os.getenv("OPENAI_API_KEY", "")
mailpilot_api = os.getenv("MAILPILOT_API_URL", "http://localhost:5000/api")

st.title("✉️ MailPilot AI Email Studio")
st.caption("Write smarter. Send professionally. Automate everything.")

tab1, tab2 = st.tabs(["Create New Email", "Multi-Step Sequence Generator"])

# ==============================================================================
# TAB 1: CREATE NEW EMAIL — EXACT WORKFLOW
# ==============================================================================
with tab1:
    st.subheader("Create New Email")
    st.caption("Progress: Email Details → Generate → Review & Send")

    with st.form("create_email_form"):
        # 1. Recipient Details
        st.markdown("##### 1. Recipient Details")
        recipient_to = st.text_input("To (Recipient Email Address) *", placeholder="recipient@company.com")
        subject_input = st.text_input("Subject", placeholder="Enter subject or leave empty for AI generation")

        # 2. Shop or Business Name
        st.markdown("##### 2. Shop or Business Name")
        shop_name = st.text_input(
            "Shop or Business Name",
            placeholder="e.g., Chennai Sports World, Nike Store, Fashion Hub, or ABC Electronics"
        )

        # 3. Email Tone / Mode
        st.markdown("##### 3. Email Tone / Mode")
        tone = st.selectbox(
            "Tone",
            ["Professional", "Formal", "Casual", "Friendly", "Persuasive"]
        )

        # 4. Email Length
        st.markdown("##### 4. Email Length")
        length = st.selectbox(
            "Length",
            ["Low", "Medium", "High"],
            format_func=lambda x: {
                "Low": "Low (Short and concise email)",
                "Medium": "Medium (Balanced email with sufficient details)",
                "High": "High (Detailed email with thorough explanation)"
            }[x]
        )

        # 5. Email Type / Purpose
        st.markdown("##### 5. Email Type / Purpose")
        purpose = st.selectbox(
            "Purpose",
            [
                "Product Inquiry",
                "Business Conversation",
                "Collaboration",
                "Sponsorship Request",
                "Partnership Proposal",
                "Price / Quotation Request",
                "Product Purchase Inquiry",
                "Wholesale Inquiry",
                "Follow-up Email",
                "Complaint / Support",
                "Custom Email",
            ]
        )
        custom_purpose = ""
        if purpose == "Custom Email":
            custom_purpose = st.text_input("Specify custom email purpose")

        # 6. Business Domain / Category
        st.markdown("##### 6. Business Domain / Category")
        domain = st.selectbox(
            "Business Domain",
            [
                "Sports & Sports Equipment",
                "Food & Restaurants",
                "Clothing & Fashion",
                "Accessories",
                "Electronics & Gadgets",
                "Footwear",
                "Healthcare",
                "Education",
                "Beauty & Personal Care",
                "Automotive",
                "General Business",
                "Other",
            ]
        )
        custom_domain = ""
        if domain == "Other":
            custom_domain = st.text_input("Specify custom domain / industry")

        # 7. Additional Instructions
        st.markdown("##### 7. Additional Instructions")
        instructions = st.text_area(
            "What should this email say?",
            placeholder="Describe your requirements in simple words..."
        )

        # 8. Generate Email Button
        generate_btn = st.form_submit_button("✨ Generate Email", use_container_width=True)

    if generate_btn:
        if not recipient_to.strip() or "@" not in recipient_to:
            st.error("Please provide a valid recipient email address.")
        elif not gemini_key:
            st.error("GEMINI_API_KEY is not set in environment.")
        else:
            with st.spinner("Generating tailored email with Gemini Flash..."):
                try:
                    eff_domain = custom_domain.strip() if domain == "Other" else domain
                    eff_purpose = custom_purpose.strip() if purpose == "Custom Email" else purpose
                    result = gemini_single_email(
                        recipient=recipient_to.strip(),
                        subject=subject_input.strip(),
                        shop_name=shop_name.strip(),
                        tone=tone,
                        length=length,
                        purpose=eff_purpose,
                        domain=eff_domain,
                        instructions=instructions.strip(),
                        api_key=gemini_key,
                    )
                    st.session_state["single_email"] = {
                        "to": recipient_to.strip(),
                        "subject": result["subject"],
                        "body": result["body"],
                        "shop": shop_name.strip(),
                        "domain": eff_domain,
                        "purpose": eff_purpose,
                    }
                    st.success("Email generated successfully! Review below.")
                except Exception as ex:
                    st.error(f"Generation error: {ex}")

    # 9. Review and Send Screen
    if "single_email" in st.session_state:
        email_data = st.session_state["single_email"]
        st.divider()
        st.markdown("### 📋 Review and Send Email")

        review_to = st.text_input("To", value=email_data["to"], key="rev_to")
        review_subject = st.text_input("Subject", value=email_data["subject"], key="rev_sub")
        review_body = st.text_area("Email Body", value=email_data["body"], height=250, key="rev_body")

        action_col1, action_col2, action_col3 = st.columns(3)
        with action_col1:
            if st.button("📋 Copy Email", use_container_width=True):
                st.code(f"Subject: {review_subject}\n\n{review_body}")
                st.success("Copied to display!")

        with action_col2:
            if st.button("🔄 Regenerate", use_container_width=True):
                st.session_state.pop("single_email", None)
                st.rerun()

        with action_col3:
            send_via_brevo = st.button("🚀 Send Email (Brevo)", use_container_width=True)

        if send_via_brevo:
            with st.spinner("Dispatching via Brevo backend..."):
                try:
                    payload = {
                        "recipientEmail": review_to,
                        "subject": review_subject,
                        "bodyText": review_body,
                        "provider": "BREVO",
                        "isDraft": False,
                    }
                    req = urllib.request.Request(
                        f"{mailpilot_api}/emails",
                        data=json.dumps(payload).encode("utf-8"),
                        headers={"Content-Type": "application/json"},
                        method="POST"
                    )
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        res_data = json.loads(resp.read().decode("utf-8"))
                        saved_id = res_data.get("email", {}).get("id")

                    # Send through Brevo endpoint
                    send_req = urllib.request.Request(
                        f"{mailpilot_api}/emails/{saved_id}/send?provider=BREVO",
                        data=json.dumps({"provider": "BREVO"}).encode("utf-8"),
                        headers={"Content-Type": "application/json"},
                        method="POST"
                    )
                    with urllib.request.urlopen(send_req, timeout=15) as send_resp:
                        st.success(f"Email successfully sent to {review_to} via Brevo backend!")
                except Exception as brevo_err:
                    st.error(f"Brevo backend delivery failed: {brevo_err}")

# ==============================================================================
# TAB 2: MULTI-STEP MARKETING SEQUENCE GENERATOR
# ==============================================================================
with tab2:
    st.subheader("Multi-Step Sequence Generator")
    with st.form("campaign_form"):
        product = st.text_input("Product or service name *", placeholder="e.g., GlowUp Skincare or MailPilot AI")
        audience = st.text_input("Target audience *", placeholder="e.g., College students aged 18–25 or Agency Founders")
        goal = st.selectbox("Campaign goal", ["Brand awareness", "Lead generation", "Product launch", "Customer engagement", "Sales conversion"])
        platform = st.selectbox("Marketing platform", ["Email", "WhatsApp", "Instagram", "LinkedIn", "SMS"])
        tone_seq = st.selectbox("Writing tone", ["Friendly", "Professional", "Exciting", "Informative", "Persuasive"])
        count = st.slider("Number of messages", min_value=2, max_value=5, value=3)
        mode = st.radio("Generation mode", ["Gemini AI (configured)", "Demo (free, template-based)", "OpenAI (requires OpenAI key)"])
        submitted = st.form_submit_button("✨ Generate sequence", use_container_width=True)

    if submitted:
        if not product.strip() or not audience.strip():
            st.error("Please enter both the product name and target audience.")
        elif mode.startswith("OpenAI") and not openai_key:
            st.error("OpenAI mode requires OPENAI_API_KEY in .env.")
        else:
            with st.spinner("Creating your campaign..."):
                try:
                    if mode.startswith("Gemini"):
                        result = gemini_sequence(product.strip(), audience.strip(), goal, platform, tone_seq, count, gemini_key)
                        st.session_state["generation_type"] = "Gemini AI-generated"
                    elif mode.startswith("OpenAI"):
                        result = ai_sequence(product.strip(), audience.strip(), goal, platform, tone_seq, count, openai_key)
                        st.session_state["generation_type"] = "OpenAI-generated"
                    else:
                        result = demo_sequence(product.strip(), audience.strip(), goal, platform, tone_seq, count)
                        st.session_state["generation_type"] = "Template demo (offline)"
                    
                    st.session_state["campaign"] = result
                    st.session_state["platform"] = platform
                    st.session_state["product"] = product.strip()
                    st.session_state["goal"] = goal
                except Exception as exc:
                    st.session_state.pop("campaign", None)
                    st.error(f"Generation failed: {exc}")

    if "campaign" in st.session_state:
        campaign = st.session_state["campaign"]
        st.divider()
        st.subheader("Your marketing sequence")
        st.info(st.session_state["generation_type"] + " • " + st.session_state["platform"])
        
        for index, item in enumerate(campaign, start=1):
            with st.container(border=True):
                st.markdown(f"**Message {index} — Day {item['day']}**")
                st.markdown(f"**Subject / Hook:** {item['subject']}")
                st.write(item["message"])
                st.markdown(f"**Call to action:** {item['call_to_action']}")
                
        col1, col2 = st.columns(2)
        with col1:
            st.download_button(
                "⬇️ Download JSON", json.dumps(campaign, indent=2, ensure_ascii=False),
                file_name="marketing_sequence.json", mime="application/json", use_container_width=True,
            )
        with col2:
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=["day", "subject", "message", "call_to_action"])
            writer.writeheader()
            writer.writerows(campaign)
            st.download_button(
                "⬇️ Download CSV", output.getvalue(), file_name="marketing_sequence.csv",
                mime="text/csv", use_container_width=True,
            )

        if st.button("🚀 Push to MailPilot AI Brevo Queue", use_container_width=True):
            try:
                steps = []
                for i, msg in enumerate(campaign):
                    steps.append({
                        "stepOrder": i + 1,
                        "delayHours": (msg["day"] - 1) * 24,
                        "subject": msg["subject"],
                        "bodyText": msg["message"],
                        "bodyHtml": f"<p>{msg['message']}</p><p><a href='#'>{msg['call_to_action']}</a></p>",
                        "ctaText": msg["call_to_action"],
                    })
                
                payload = {
                    "name": f"{st.session_state.get('product', 'Campaign')}: {st.session_state.get('goal', 'Launch')}",
                    "sequenceType": st.session_state.get('goal', 'Product launch'),
                    "strategy": f"Generated via Streamlit Generator for {st.session_state.get('platform')}",
                    "steps": steps,
                }

                req = urllib.request.Request(
                    f"{mailpilot_api}/sequences",
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=10) as resp:
                    res_data = json.loads(resp.read().decode("utf-8"))
                    st.success(f"Successfully synced sequence '{payload['name']}' into MailPilot AI database! ID: {res_data.get('sequence', {}).get('id')}")
            except Exception as e:
                st.warning(f"Could not push directly to MailPilot backend: {e}. Ensure MailPilot backend is running on {mailpilot_api}.")

st.caption("MailPilot AI — Write smarter. Send professionally. Automate everything.")
