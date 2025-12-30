/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	transpilePackages: [],
	sassOptions: {
		implementation: 'sass',
		additionalData: `@use '@/app/styles/variables.scss' as *;`,
	},
  webpack: (config, { isServer }) => {
		if (isServer) {
			config.externals.push('@libsql/client');
		}
		
		// 忽略 README.md 文件
		config.module.rules.push({
			test: /\.md$/,
			type: 'asset/source',
		});
		
		return config;
	},
};

module.exports = nextConfig;
