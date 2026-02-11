# Email Draft: StackOne Data Processing & Security Overview

---

**Subject:** StackOne Project Management & Data Security: A Comprehensive Overview

Hi [Synthesia Team],

Following up on our recent discussion, I wanted to provide a comprehensive overview of how StackOne handles data processing, project management, and security features—particularly our AI capabilities—to help you better secure your organization.

## 🔐 Project-Based Security Architecture

StackOne uses a **project-based structure** that mirrors your deployment environments (Development, Staging, QA, Production). This architecture provides granular access control:

### Organization & Project Management
- **Organization Level**: All team members must first be added to your StackOne organization
- **Project Level**: Organization/Project admins control who can access each project and with what permissions
- **Role-Based Access**:
  - **Project Admin**: Can create API keys, manage project settings (IP restrictions, AI features), and add/remove team members
  - **Project Viewer**: Read-only access to project resources

**Use Case**: Restrict production project access to 1-2 infrastructure-level administrators while allowing broader access to development/staging projects for testing and QA.

📖 [Managing Your Organization](https://docs.stackone.com/guides/managing-your-organization) | [Project Settings](https://docs.stackone.com/guides/project-settings)

---

## 🛡️ Data Processing & Privacy Controls

### Advanced Logs (Opt-In Feature)
By default, **StackOne does NOT store request/response data** flowing through the system—only high-level metadata (action called, timestamp).

**When to Enable Advanced Logs:**
- ✅ Debugging errors in development/staging environments
- ✅ Short-term troubleshooting (can be auto-disabled after a set duration)
- ✅ Error-only logging (stores data only when errors occur)

**Configuration Options:**
- Store data for errors only or all requests
- Set automatic expiration dates (e.g., enable for 2-3 days during investigation)
- Disable entirely when not needed

### Regional Data Processing
- Respects the region selected during project creation (EU or US)
- AI features use Anthropic's Claude models via AWS Bedrock in your selected region

📖 [Auth Configurations](https://docs.stackone.com/guides/auth-configurations)

---

## 🤖 AI Features Overview

### 1. Error Explainer (Opt-In)
**What It Does**: Provides AI-powered root cause analysis for API errors using context from failed requests and provider API documentation.

**Privacy & Control:**
- ✅ Completely opt-in (can be disabled per project)
- ✅ Only works when Advanced Logs are enabled
- ✅ Data is NOT used for model training
- ✅ Optional feedback submission (see below)
- ✅ Uses Anthropic Claude via AWS Bedrock in your selected region

**Note**: Users can submit feedback on error explanations. This feedback is anonymized and may be used to improve prompts/tool descriptions, but raw data is not used for training.

### 2. Playground (Opt-In)
**What It Does**: Interactive testing environment to explore StackOne actions on linked accounts (test tenants, sandbox accounts).

**Recommended Usage:**
- ✅ Testing and debugging in development/staging
- ✅ Getting familiar with StackOne's capabilities
- ❌ NOT recommended for production customer data

**Privacy & Feedback:**
- When users interact with the Playground, tool calls and initial prompts are recorded (NOT the response data)
- If the LLM detects user frustration/feedback, it may trigger an anonymization process and summarize feedback
- Feedback is used to improve prompts and tool descriptions (not for model training)
- Data retention is limited

**Access Control Options:**
- Disable Playground entirely for your organization (contact StackOne)
- Restrict to Project Admins only (Project Viewers cannot access)
- Use only on non-production projects with test/sandbox accounts

📖 [AI Features Documentation](https://docs.stackone.com/guides/ai-features)

---

## 🎯 Recommended Security Setup

### For Production Projects:
1. **Limit Project Admins**: Assign only 1-2 trusted administrators (treat as AWS-level infrastructure access)
2. **Restrict Team Access**: Add other team members as Project Viewers
3. **Disable Playground Access**: Request that Project Viewers cannot access Playground (contact us to configure)
4. **Advanced Logs**: Keep disabled unless actively debugging, then enable temporarily with auto-expiration
5. **Error Explainer**: Enable only if needed, disable when not in use

### For Development/Staging Projects:
1. **Broader Access**: Engineers can be Project Admins on their own dev/staging projects
2. **Playground Enabled**: Great for testing with sandbox/test accounts
3. **Advanced Logs**: Can remain enabled for debugging purposes
4. **QA & Testing**: Ideal environment for team members to explore StackOne capabilities safely

---

## 🔑 Key Takeaways

✅ **Opt-In Philosophy**: All data storage and AI features are completely optional
✅ **Granular Control**: Project-level permissions allow different security postures per environment
✅ **Regional Compliance**: Data processing respects your selected region (EU/US)
✅ **No Training on Your Data**: Error Explainer does not use your data for model training (anonymized feedback only)
✅ **Time-Bound Access**: Advanced Logs can auto-expire after investigation periods
✅ **IP Restrictions**: Additional security layer available per project

---

## Next Steps

1. Review your current project structure and team access
2. Determine which AI features align with your security policies
3. Configure project settings per the recommendations above
4. Contact us if you'd like to:
   - Disable Playground for specific roles
   - Discuss custom security configurations
   - Review IP restriction setup

Let me know if you have any questions or would like to discuss any of these features in more detail!

Best regards,
[Your Name]

---

**Relevant Documentation:**
- [Managing Your Organization](https://docs.stackone.com/guides/managing-your-organization)
- [Project Settings](https://docs.stackone.com/guides/project-settings)
- [AI Features](https://docs.stackone.com/guides/ai-features)
- [Auth Configurations](https://docs.stackone.com/guides/auth-configurations)
