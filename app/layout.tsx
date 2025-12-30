import type { Metadata } from 'next';
import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { lightTheme } from './theme';
import './styles/global.scss';

export const metadata: Metadata = {
	title: 'BlockFoundry Web',
	description: 'BlockFoundry Web Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="zh-CN">
			<body>
				<ConfigProvider locale={zhCN} theme={lightTheme}>
					<App>{children}</App>
				</ConfigProvider>
			</body>
		</html>
	);
}
