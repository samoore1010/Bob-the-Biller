# Law Firm Billing Dashboard

A comprehensive legal billing management application designed to streamline the process of tracking time, assigning matters, and generating professional billing narratives using AI.

## Features

- **Intelligent Dashboard**: Real-time overview of billable hours, amounts, and activity distribution.
- **Smart Matter Assignment**: Automatically categorize emails and events into specific legal matters using customizable "Smart Rules" and contact mappings.
- **AI-Powered Narratives**: Utilize Google Gemini AI to transform raw activity logs into polished, professional billing descriptions.
- **Flexible Time Tracking**: Manage inbound/outbound communications and events with configurable rates and durations.
- **Cast of Characters**: Maintain a directory of clients and internal staff mapped to specific matters for accurate attribution.
- **Bulk Operations**: Update multiple entries at once and use the built-in undo system for safety.
- **Advanced Filtering**: Slice and dice your data by matter, activity type, and custom date ranges.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI Integration**: @google/genai (Gemini 3 Flash)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A Gemini API Key (for AI narrative generation)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your environment variables:
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. **Import Activities**: Use the upload feature to bring in your communication logs or calendar events.
2. **Configure Rules**: Set up "Smart Rules" in the settings to automate the assignment of future activities based on keywords or correspondents.
3. **Review & Edit**: Use the dashboard to review entries, adjust durations, or manually assign matters.
4. **Generate Narratives**: Select one or more entries and click the "Sparkles" icon to let AI draft your billing descriptions.
5. **Export**: Once finalized, export your entries for your firm's accounting system.
