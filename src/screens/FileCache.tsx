import React from 'react';
import {Alert, ScrollView, StyleSheet} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {Caption} from 'react-native-paper';
import {useDispatch} from 'react-redux';
import {useTypedSelector} from 'data/store';
import {setSetting} from 'data/actions/settings';
import {removeFileDir} from 'helpers/fs';
import useToast from 'hooks/useToast';
import useNavigationAnimation from 'hooks/useNavigationAnimation';
import TableCell from 'components/TableCell';
import SafeArea from 'components/SafeArea';
import {ScreenParams} from './types';

const FileCache: React.FC<StackScreenProps<ScreenParams, 'FileCache'>> = (
  props,
) => {
  const toast = useToast();

  const dispatch = useDispatch();
  const fileUseDocumentDir = useTypedSelector(
    (state) => state.settings.fileUseDocumentDir,
  );

  const handleClearCache = () => {
    Alert.alert(
      '清空文件缓存',
      '确定清空文件缓存？该操作不可撤销。',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '确定',
          onPress: async () => {
            try {
              await removeFileDir();
              toast('清空文件缓存成功', 'success');
            } catch (e) {
              toast('清空文件缓存失败：' + (e as Error).message, 'error');
            }
          },
        },
      ],
      {cancelable: true},
    );
  };

  useNavigationAnimation(props);

  return (
    <SafeArea>
      <ScrollView contentContainerStyle={styles.scrollViewPaddings}>
        <TableCell
          iconName="cached"
          primaryText="保存打开的文件到“文档”"
          switchValue={fileUseDocumentDir}
          onSwitchValueChange={(value) =>
            dispatch(setSetting('fileUseDocumentDir', value))
          }
          type="switch"
        />
        <Caption style={styles.caption}>
          {fileUseDocumentDir
            ? '文件保存在 App 的“文档”中，只会随 App 卸载而被删除。'
            : '文件保存在 App 的“缓存”中，会在设备空间不足或其他系统预设情况下被自动清除以节约空间。'}
        </Caption>
        <TableCell
          style={styles.marginTop}
          iconName="delete"
          primaryText="清空文件缓存"
          type="none"
          onPress={handleClearCache}
        />
      </ScrollView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  marginTop: {
    marginTop: 32,
  },
  scrollViewPaddings: {
    paddingVertical: 32,
  },
  caption: {
    marginTop: 8,
    marginHorizontal: 16,
  },
});

export default FileCache;
