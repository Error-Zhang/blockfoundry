export const lightTheme = {
  token: {
    // 主色调 - 经典黑白主题
    colorPrimary: '#000000', // 纯黑色
    colorSuccess: '#52c41a', // 绿色
    colorWarning: '#faad14', // 橙色
    colorError: '#ff4d4f', // 红色
    colorInfo: '#1890ff', // 蓝色
    
    // 背景色（纯白）
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#fafafa',
    colorBgSpotlight: '#ffffff',
    
    // 文字色（黑白对比）
    colorText: '#000000',
    colorTextSecondary: '#666666',
    colorTextTertiary: '#999999',
    colorTextQuaternary: '#cccccc',
    
    // 边框（灰色）
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
    
    // 圆角
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    
    // 字体
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeXL: 20,
    
    // 阴影（轻微）
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.15)',
    
    // 间距
    padding: 16,
    paddingLG: 24,
    paddingXL: 32,
    margin: 16,
    marginLG: 24,
    marginXL: 32,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: '#ffffff',
      bodyBg: '#fafafa',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#f0f0f0',
      itemHoverBg: '#f5f5f5',
      itemColor: '#666666',
      itemSelectedColor: '#000000',
      itemHoverColor: '#000000',
      itemBorderRadius: 6,
      itemMarginInline: 0,
      itemMarginBlock: 4,
      itemPaddingInline: 16,
      itemHeight: 40,
      fontSize: 14,
      fontWeight: 500,
    },
    Button: {
      borderRadius: 6,
      controlHeight: 32,
      paddingContentHorizontal: 16,
    },
    Card: {
      borderRadius: 8,
      paddingLG: 24,
    },
    Input: {
      borderRadius: 6,
      controlHeight: 32,
      paddingInline: 12,
    },
    Table: {
      borderRadius: 6,
      headerBg: '#fafafa',
    },
  },
}