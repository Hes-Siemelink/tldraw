import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(() => {
	return {
		plugins: [
			cloudflare(),
			react(
				/* EXCLUDE_FROM_TEMPLATE_EXPORT_START */
				{ tsDecorators: true }
				/* EXCLUDE_FROM_TEMPLATE_EXPORT_END */
			),
		],
		server: {
			host: '0.0.0.0', // Bind to all interfaces
			port: 5173,
			cors: true, // Enable CORS for external access
		},
	}
})
