import React, { ReactNode } from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import styles from './StatisticsCards.module.scss';

interface StatisticsCardsProps {
	cardConfigs: {
		key: string;
		title: string;
		value: number | string;
		prefix?: ReactNode;
		suffix?: string;
	}[];
	gutter?: number;
}

const StatisticsCards: React.FC<StatisticsCardsProps> = ({ cardConfigs, gutter = 16 }) => {
	return (
		<Row gutter={gutter} className={styles.statisticsCards}>
			{cardConfigs.map((config) => (
				<Col key={config.key} span={6}>
					<Card>
						<Statistic title={config.title} value={config.value} prefix={config.prefix} suffix={config.suffix} />
					</Card>
				</Col>
			))}
		</Row>
	);
};

export default StatisticsCards;
