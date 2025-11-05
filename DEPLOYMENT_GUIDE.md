# Deployment Guide

This guide will help you push your code to GitHub and deploy to Vercel.

## Current Status

✅ **Git repository initialized**
✅ **All changes committed**
✅ **Vercel CLI installed**

## Next Steps

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right → "New repository"
3. Repository name: `amgmt` (or your preferred name)
4. **Don't** initialize with README, .gitignore, or license (you already have these)
5. Click "Create repository"

### Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Run these in your terminal:

```bash
cd /Users/simonh/amgmt
git remote add origin https://github.com/YOUR_USERNAME/amgmt.git
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME` with your actual GitHub username.**

### Step 3: Deploy to Vercel

You have two options:

#### Option A: Using Vercel Dashboard (Recommended - Automatic Deployments)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository (connect GitHub account if needed)
4. Configure project:
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `.next` (should auto-detect)
5. **Add Environment Variables** (Settings → Environment Variables):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
   RESEND_API_KEY=your_resend_api_key
   SITE_URL=https://your-app.vercel.app
   ```
6. Click "Deploy"

**Future deployments**: Every push to `main` will automatically deploy!

#### Option B: Using Vercel CLI

1. Login to Vercel:
   ```bash
   vercel login
   ```

2. Link your project:
   ```bash
   cd /Users/simonh/amgmt
   vercel link
   ```
   (Follow prompts to link to existing project or create new one)

3. Add environment variables:
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add RESEND_API_KEY
   vercel env add SITE_URL
   ```
   (Enter values when prompted)

4. Deploy to production:
   ```bash
   vercel --prod
   ```

### Step 4: Update Production Database

After deploying, make sure your production Supabase database has all the necessary migrations:

1. Go to your production Supabase project dashboard
2. Open the SQL Editor
3. Run any SQL migration files from your project that haven't been applied yet
4. Verify all tables, RLS policies, and functions are in place

### Step 5: Verify Deployment

1. Visit your production URL (e.g., `https://your-app.vercel.app`)
2. Test critical features:
   - Login/Signup
   - Creating artists/releases
   - File uploads
   - Access permissions
3. Check Vercel dashboard for any build errors or warnings

## Environment Variables Reference

Make sure these are set in Vercel (Production environment):

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (keep this secret!)
- `RESEND_API_KEY` - Your Resend API key for email sending
- `SITE_URL` - Your production URL (e.g., `https://your-app.vercel.app`)

## Troubleshooting

### Build Failures
- Check Vercel build logs for specific errors
- Ensure all environment variables are set
- Verify `package.json` has correct dependencies

### Database Connection Issues
- Verify Supabase environment variables are correct
- Check Supabase project is active and accessible
- Ensure RLS policies allow production access

### Email Issues
- Verify Resend API key is valid
- Check `SITE_URL` matches your production domain
- Review email service logs in Vercel

## Continuous Deployment

Once set up, your workflow will be:

1. **Make changes locally**
2. **Commit and push to GitHub**:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```
3. **Vercel automatically deploys** (if using dashboard method)
4. **Monitor deployment** in Vercel dashboard

## Manual Deployment (if needed)

If you need to deploy manually without pushing to GitHub:

```bash
vercel --prod
```


