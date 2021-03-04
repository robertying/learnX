import React, {useEffect, useState} from 'react';
import {Alert, Linking, Platform, ScrollView, StyleSheet} from 'react-native';
import {useDispatch} from 'react-redux';
import {StackActions} from '@react-navigation/native';
import {StackScreenProps} from '@react-navigation/stack';
import semverGt from 'semver/functions/gt';
import SafeArea from 'components/SafeArea';
import TableCell from 'components/TableCell';
import Styles from 'constants/Styles';
import {getLatestRelease} from 'helpers/update';
import {setSetting} from 'data/actions/settings';
import {clearStore} from 'data/actions/root';
import {useTypedSelector} from 'data/store';
import useDetailNavigator from 'hooks/useDetailNavigator';
import {ScreenParams} from './types';
import packageJson from '../../package.json';

const Settings: React.FC<StackScreenProps<ScreenParams, 'Settings'>> = ({
  navigation,
}) => {
  const detailNavigator = useDetailNavigator();

  const dispatch = useDispatch();
  const userInfo = useTypedSelector((state) => state.user);
  const username = useTypedSelector((state) => state.auth.username);
  const newChangelog = useTypedSelector(
    (state) => state.settings.lastShowChangelogVersion !== packageJson.version,
  );

  const [update, setUpdate] = useState<{version: string; url: string} | null>(
    null,
  );

  const handlePush = (name: keyof ScreenParams) => {
    if (detailNavigator) {
      detailNavigator.dispatch(
        StackActions.replace(name, {
          disableAnimation: true,
        }),
      );
    } else {
      navigation.push(name);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      '注销账号',
      '确定注销账号？',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '确定',
          onPress: () => {
            dispatch(clearStore());
          },
        },
      ],
      {cancelable: true},
    );
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
      (async () => {
        const {version, url} = await getLatestRelease();
        if (semverGt(version, packageJson.version)) {
          setUpdate({
            version,
            url,
          });
          dispatch(setSetting('newUpdate', true));
        }
      })();
    }
  }, [dispatch]);

  return (
    <SafeArea>
      <ScrollView style={Styles.flex1}>
        <TableCell
          imageAlt={userInfo.name ?? username ?? 'learnX'}
          primaryText={userInfo.name ?? username ?? 'learnX'}
          secondaryText={userInfo.department ?? undefined}
          type="none"
        />
        <TableCell
          iconName="person-remove"
          primaryText="注销"
          type="none"
          onPress={handleLogout}
        />
        <TableCell
          style={styles.marginTop}
          iconName="date-range"
          primaryText="日历与提醒事项"
          type="arrow"
          onPress={() => handlePush('CalendarEvent')}
        />
        <TableCell
          iconName="loop"
          primaryText="学期切换"
          type="arrow"
          onPress={() => handlePush('SemesterSelection')}
        />
        <TableCell
          iconName="rule-folder"
          primaryText="文件缓存"
          type="arrow"
          onPress={() => handlePush('FileCache')}
        />
        {/* <TableCell
          style={styles.marginTop}
          iconName="grade"
          primaryText="课程信息共享计划"
          type="arrow"
          onPress={() => handlePush('CourseX')}
        /> */}
        <TableCell
          style={styles.marginTop}
          iconName="sticky-note-2"
          badge={newChangelog}
          primaryText="更新日志"
          type="arrow"
          onPress={() => handlePush('Changelog')}
        />
        {update && (
          <TableCell
            iconName="update"
            badge
            primaryText={`检测到新版本 v${update.version}`}
            type="none"
            onPress={() => Linking.openURL(update.url)}
          />
        )}
        <TableCell
          iconName="help"
          primaryText="帮助与反馈"
          type="arrow"
          onPress={() => handlePush('Help')}
        />
        <TableCell
          iconName="copyright"
          primaryText="关于"
          type="arrow"
          onPress={() => handlePush('About')}
        />
      </ScrollView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  marginTop: {
    marginTop: 16,
  },
});

export default Settings;
