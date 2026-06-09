import React from 'react';
import {
  AppText,
  Center,
  AppPressable,
  AppView,
  Row,
  Col,
  useTheme,
  Icon,
} from '@gaozh1024/rn-kit';
import { Logo, PageScreen } from '../../../components/common';
import { appInfo } from '../../../data/mocks/app.mock';
import { appColors } from '../../../bootstrap/theme';

/**
 * 链接按钮
 */
function LinkButton({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress?: () => void;
}) {
  const { isDark } = useTheme();

  return (
    <AppPressable onPress={onPress}>
      <Row
        items="center"
        style={{
          paddingVertical: 16,
        }}
      >
        <Icon name={icon} size={24} color={isDark ? appColors.slate[400] : appColors.slate[500]} />
        <AppText
          size="md"
          style={{
            flex: 1,
            marginLeft: 16,
            color: isDark ? appColors.slate[200] : appColors.slate[700],
          }}
        >
          {label}
        </AppText>
        <Icon
          name="open-in-new"
          size={20}
          color={isDark ? appColors.slate[500] : appColors.slate[300]}
        />
      </Row>
    </AppPressable>
  );
}

/**
 * 版本信息项
 */
function VersionItem({ label, value }: { label: string; value: string }) {
  const { isDark } = useTheme();

  return (
    <Row
      items="center"
      justify="between"
      style={{
        paddingVertical: 16,
      }}
    >
      <AppText
        size="md"
        style={{
          color: isDark ? appColors.slate[400] : appColors.slate[500],
        }}
      >
        {label}
      </AppText>
      <AppText
        size="md"
        weight="medium"
        style={{
          color: isDark ? appColors.slate[200] : appColors.slate[700],
        }}
      >
        {value}
      </AppText>
    </Row>
  );
}

/**
 * 功能特性卡片
 */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  const { isDark } = useTheme();

  return (
    <AppView
      style={{
        flex: 1,
        minWidth: '45%',
        backgroundColor: isDark ? appColors.slate[800] : '#ffffff',
        borderRadius: 20,
        padding: 20,
        shadowColor: isDark ? '#000000' : appColors.slate[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.25 : 0.04,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <AppView
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          backgroundColor: isDark ? appColors.slate[700] : appColors.slate[100],
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Icon name={icon} size={26} color={appColors.primary[500]} />
      </AppView>
      <AppText
        size="md"
        weight="semibold"
        style={{
          color: isDark ? appColors.slate[200] : appColors.slate[700],
        }}
      >
        {title}
      </AppText>
      <AppText
        size="sm"
        style={{
          color: isDark ? appColors.slate[500] : appColors.slate[400],
          marginTop: 8,
        }}
      >
        {description}
      </AppText>
    </AppView>
  );
}

/**
 * 关于我们页 - 使用 AppHeader
 */
export function AboutScreen() {
  const { isDark } = useTheme();

  const features = [
    { icon: 'speed', title: '高性能', description: '优化的渲染性能' },
    { icon: 'security', title: '安全可靠', description: '企业级安全保障' },
    { icon: 'palette', title: '现代设计', description: '精美的用户界面' },
    { icon: 'update', title: '持续更新', description: '定期功能迭代' },
  ];

  return (
    <PageScreen
      title="关于我们"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 20,
      }}
    >
      {/* 品牌区域 */}
      <Center style={{ paddingVertical: 32 }}>
        <Logo size="xl" />
        <AppView
          style={{
            backgroundColor: isDark ? `${appColors.primary[500]}15` : appColors.primary[50],
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 12,
            marginTop: 20,
          }}
        >
          <AppText size="sm" weight="semibold" style={{ color: appColors.primary[500] }}>
            版本 {appInfo.version}
          </AppText>
        </AppView>
        <AppText
          size="md"
          style={{
            color: isDark ? appColors.slate[400] : appColors.slate[500],
            textAlign: 'center',
            marginTop: 16,
            maxWidth: 280,
            lineHeight: 24,
          }}
        >
          基于 @gaozh1024/rn-kit 构建的现代化 React Native 应用模板
        </AppText>
      </Center>

      {/* 功能特性 */}
      <AppView style={{ marginBottom: 24 }}>
        <AppText
          size="xs"
          weight="semibold"
          style={{
            color: isDark ? appColors.slate[500] : appColors.slate[500],
            marginBottom: 16,
            marginLeft: 4,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          功能特性
        </AppText>
        <Row gap={12} style={{ flexWrap: 'wrap' }}>
          {features.map(feature => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </Row>
      </AppView>

      {/* 版本信息 */}
      <AppView style={{ marginBottom: 24 }}>
        <AppText
          size="xs"
          weight="semibold"
          style={{
            color: isDark ? appColors.slate[500] : appColors.slate[500],
            marginBottom: 12,
            marginLeft: 4,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          版本信息
        </AppText>
        <AppView
          style={{
            backgroundColor: isDark ? appColors.slate[800] : '#ffffff',
            borderRadius: 20,
            paddingHorizontal: 20,
            overflow: 'hidden',
            shadowColor: isDark ? '#000000' : appColors.slate[900],
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.04,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <VersionItem label="版本号" value={appInfo.version} />
          <AppView
            style={{
              height: 1,
              backgroundColor: isDark ? appColors.slate[700] : appColors.slate[100],
            }}
          />
          <VersionItem label="构建号" value={appInfo.buildNumber} />
          <AppView
            style={{
              height: 1,
              backgroundColor: isDark ? appColors.slate[700] : appColors.slate[100],
            }}
          />
          <VersionItem label="环境" value={appInfo.environment} />
          <AppView
            style={{
              height: 1,
              backgroundColor: isDark ? appColors.slate[700] : appColors.slate[100],
            }}
          />
          <VersionItem label="RN 版本" value="0.83.6" />
          <AppView
            style={{
              height: 1,
              backgroundColor: isDark ? appColors.slate[700] : appColors.slate[100],
            }}
          />
          <VersionItem label="Expo SDK" value="~55.0.26" />
        </AppView>
      </AppView>

      {/* 相关链接 */}
      <AppView style={{ marginBottom: 24 }}>
        <AppText
          size="xs"
          weight="semibold"
          style={{
            color: isDark ? appColors.slate[500] : appColors.slate[500],
            marginBottom: 12,
            marginLeft: 4,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          相关链接
        </AppText>
        <AppView
          style={{
            backgroundColor: isDark ? appColors.slate[800] : '#ffffff',
            borderRadius: 20,
            paddingHorizontal: 20,
            overflow: 'hidden',
            shadowColor: isDark ? '#000000' : appColors.slate[900],
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.04,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <LinkButton icon="description" label="用户协议" />
          <AppView
            style={{
              height: 1,
              backgroundColor: isDark ? appColors.slate[700] : appColors.slate[100],
            }}
          />
          <LinkButton icon="policy" label="隐私政策" />
          <AppView
            style={{
              height: 1,
              backgroundColor: isDark ? appColors.slate[700] : appColors.slate[100],
            }}
          />
          <LinkButton icon="help-outline" label="帮助中心" />
          <AppView
            style={{
              height: 1,
              backgroundColor: isDark ? appColors.slate[700] : appColors.slate[100],
            }}
          />
          <LinkButton icon="feedback" label="反馈建议" />
          <AppView
            style={{
              height: 1,
              backgroundColor: isDark ? appColors.slate[700] : appColors.slate[100],
            }}
          />
          <LinkButton icon="code" label="开源代码" />
        </AppView>
      </AppView>

      {/* 版权信息 */}
      <Center style={{ marginTop: 16, marginBottom: 32 }}>
        <Row items="center" style={{ gap: 6 }}>
          <Icon name="favorite" size={16} color={appColors.error.DEFAULT} />
          <AppText
            size="sm"
            style={{
              color: isDark ? appColors.slate[500] : appColors.slate[400],
            }}
          >
            用 ❤️ 打造
          </AppText>
        </Row>
        <AppText
          size="sm"
          style={{
            color: isDark ? appColors.slate[600] : appColors.slate[400],
            textAlign: 'center',
            marginTop: 12,
          }}
        >
          © 2024 Panther Team. All rights reserved.
        </AppText>
        <AppText
          size="sm"
          style={{
            color: isDark ? appColors.slate[600] : appColors.slate[400],
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          基于 @gaozh1024/rn-kit 构建
        </AppText>
      </Center>
    </PageScreen>
  );
}
