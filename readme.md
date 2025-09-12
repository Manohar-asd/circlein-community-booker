# CircleIn - Community Amenity Booker

A dynamic web app for housing society amenity booking. Built with Next.js, Firebase, and Tailwind CSS to streamline facility management and enhance community living.

This project is currently under active development.

## Tech Stack

-   **Framework:** Next.js (with App Router)
-   **Language:** TypeScript
-   **Database:** Google Firestore
-   **Authentication:** NextAuth.js
-   **Styling:** Tailwind CSS
-   **UI Components:** shadcn/ui
-   **Icons:** Lucide React

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   Node.js (v18 or later)
-   npm

### Installation

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/your-username/circlein-community-booker.git](https://github.com/your-username/circlein-community-booker.git)
    ```
2.  **Navigate into the project directory:**
    ```sh
    cd circlein-community-booker
    ```
3.  **Install NPM packages:**
    ```sh
    npm install
    ```
4.  **Set up environment variables:**
    -   Create a `.env.local` file in the root of the project.
    -   Add your Firebase configuration and NextAuth.js keys.
    ```env
    # Firebase Config
    NEXT_PUBLIC_FIREBASE_API_KEY=...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
    # ... and so on

    # NextAuth.js Config
    GOOGLE_CLIENT_ID=...
    GOOGLE_CLIENT_SECRET=...
    NEXTAUTH_SECRET=... # Run `openssl rand -base64 32` in your terminal to generate this
    NEXTAUTH_URL=http://localhost:3000
    ```
5.  **Run the development server:**
    ```sh
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
