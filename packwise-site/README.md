# PackWise website

The PackWise app as its own website. Visitors use it without a Claude account. The AI runs on your developer account, and you pay a small amount each time someone builds a list, chats with the suitcase, or plans outfits.

## What's in this folder

- `index.html` is the app people see.
- `api/claude.js` is the behind-the-scenes helper. It holds your secret key, so visitors never see it, and it limits how fast any one person can use the AI.
- `package.json` and `vercel.json` are settings for the hosting service. Leave them as they are.

## Setup, one time (about 30 minutes)

### 1. Get your AI key
1. Go to https://platform.claude.com and sign up. This is separate from the Claude account you chat with.
2. Open **Billing** and buy a small amount of credit, like $10 to $20. Leave auto-reload off. Then the site can never spend more than you put in.
3. Open **API Keys**, click **Create key**, and name it `PackWise website`.
4. Copy the key and keep it somewhere private, like a password manager. It's shown only once, and anyone who has it can spend your credit.

### 2. Put the files on GitHub
1. Sign up at https://github.com (free).
2. Click **New repository** and name it `packwise`. Private is fine.
3. Click **uploading an existing file**, then drag in everything from this folder, including the `api` folder. Click **Commit changes**.

### 3. Put it online with Vercel
1. Sign up at https://vercel.com with your GitHub account (free Hobby plan).
2. Click **Add New → Project** and import `packwise`.
3. Before deploying, open **Environment Variables** and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: the key from step 1
4. Click **Deploy**. In about a minute you get a link like `packwise-xxxx.vercel.app`. That's your live site.

### 4. Turn on the visit counter
In your Vercel project, open **Analytics** and click **Enable**. You'll see how many people visit and from what kind of device. It collects no names or emails.

### 5. Optional: your own web address
Buy a name like `packwise.app` (Vercel can sell you one under **Domains**, or use any registrar), then add it in the project's **Domains** settings.

## Making changes later

Edit the files on GitHub, or ask Claude to change them and upload the new versions. Vercel republishes the site automatically every time GitHub changes.

## Optional settings

Add these the same way as the key, under **Environment Variables**:

- `PACKWISE_PER_MINUTE`: how many AI requests one visitor can make per minute. Default 8.
- `PACKWISE_MODEL`: which Claude model does the main work. Default `claude-sonnet-5-5`.

## If something goes wrong

- **"The AI helper isn't switched on for this site yet."** The key is missing or mistyped. Check the environment variable, then click **Redeploy**.
- **"Too many requests"** or **"PackWise is busy."** Wait a minute and try again. If it keeps happening, check that you still have credit at platform.claude.com.
- To see error details, open the project in Vercel and look under **Logs**.
