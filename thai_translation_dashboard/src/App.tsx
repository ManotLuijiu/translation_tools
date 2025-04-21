// biome-ignore lint/style/useImportType: <explanation>
import React from 'react'
import { FrappeProvider } from 'frappe-react-sdk'

import { AppProvider } from './context/AppProvider'
import Dashboard from './components/Dashboard'
import { Toaster } from '@/components/ui/sonner'

const App: React.FC = () => {
	return (
		<FrappeProvider
			siteName={import.meta.env.VITE_SITE_NAME}
			socketPort={import.meta.env.VITE_SOCKET_PORT}
		>
			<AppProvider>
				<div className="min-h-screen bg-background dark:bg-background-dark">
					<main className="container mx-auto px-4">
						<Dashboard />
					</main>
					<Toaster />
				</div>
			</AppProvider>
		</FrappeProvider>
	)
}

export default App
