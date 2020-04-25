import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  Text,
  StyleSheet,
  View,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {iOSUIKit} from 'react-native-typography';
import DocumentPicker from 'react-native-document-picker';
import {submitAssignment} from '../redux/dataSource';
import Icon from 'react-native-vector-icons/MaterialIcons';
import TextButton from '../components/TextButton';
import Colors from '../constants/Colors';
import {getTranslation} from '../helpers/i18n';
import {INavigationScreen} from '../types';
import {adaptToSystemTheme} from '../helpers/darkmode';
import {useColorScheme} from 'react-native-appearance';
import RaisedButton from '../components/RaisedButton';
import Snackbar from 'react-native-snackbar';
import {Navigation} from 'react-native-navigation';
import Divider from '../components/Divider';
import {removeTags} from '../helpers/html';
import {
  ProgressBar,
  DarkTheme,
  DefaultTheme,
  Provider as PaperProvider,
} from 'react-native-paper';
import {useWindow} from '../hooks/useWindow';

export interface IAssignmentSubmitScreenProps {
  studentHomeworkId: string;
  submittedAttachmentName?: string;
  submittedContent?: string;
}

const styles = StyleSheet.create({
  cancel: {
    margin: 16,
    flex: 0,
    width: 64,
  },
  textInput: {
    flex: 1,
    margin: 8,
    padding: 16,
    paddingTop: 16,
    paddingBottom: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  row: {
    padding: 15,
    paddingLeft: 20,
    paddingRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  note: {
    fontStyle: 'italic',
  },
});

interface DocumentPickerResponse {
  uri: string;
  type: string;
  name: string;
  size: string;
}

const AssignmentSubmitScreen: INavigationScreen<IAssignmentSubmitScreenProps> = (
  props,
) => {
  const {studentHomeworkId, submittedAttachmentName, submittedContent} = props;

  const colorScheme = useColorScheme();

  useEffect(() => {
    adaptToSystemTheme(props.componentId, colorScheme);
  }, [colorScheme, props.componentId]);

  const [content, setContent] = useState(
    removeTags(submittedContent || '').replace('-->', ''),
  );
  const [fileResult, setFileResult] = useState<DocumentPickerResponse>();

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.pick<'ios' | 'android'>({
        type: ['public.item', '*/*'] as any,
      });
      setFileResult(result);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Snackbar.show({
          text: getTranslation('pickFileError'),
          duration: Snackbar.LENGTH_LONG,
        });
      }
    }
  };

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleSubmit = async () => {
    setUploading(true);

    try {
      if (attachmentRemoved) {
        await submitAssignment(
          studentHomeworkId,
          '',
          undefined,
          setProgress,
          true,
        );
      } else if (content || fileResult) {
        await submitAssignment(
          studentHomeworkId,
          content,
          fileResult
            ? {
                uri: fileResult.uri,
                name: fileResult.name,
              }
            : undefined,
          setProgress,
        );
      }

      setUploading(false);
      setProgress(0);
      await Navigation.dismissModal(props.componentId);
      Snackbar.show({
        text: getTranslation('submitAssignmentSuccess'),
        duration: Snackbar.LENGTH_SHORT,
      });
    } catch {
      setUploading(false);
      setProgress(0);
      Snackbar.show({
        text: getTranslation('submitAssignmentFail'),
        duration: Snackbar.LENGTH_SHORT,
      });
    }
  };

  const handleSubmitPress = () => {
    Keyboard.dismiss();

    if (!attachmentRemoved && !content && !fileResult) {
      Snackbar.show({
        text: getTranslation('completeAssignment'),
        duration: Snackbar.LENGTH_SHORT,
      });
      return;
    }

    Alert.alert(
      getTranslation('submitAssignment'),
      getTranslation('submitAssignmentConfirmation'),
      [
        {
          text: getTranslation('cancel'),
          style: 'cancel',
        },
        {
          text: getTranslation('ok'),
          onPress: async () => {
            await handleSubmit();
          },
        },
      ],
      {cancelable: true},
    );
  };

  const [attachmentRemoved, setAttachmentRemoved] = useState(false);

  const handleRemove = () => {
    setAttachmentRemoved(!attachmentRemoved);
  };

  const handleRemoveNew = () => {
    setFileResult(undefined);
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    Navigation.dismissModal(props.componentId);
  };

  const window = useWindow();

  return (
    <PaperProvider theme={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: Colors.system('background', colorScheme),
        }}>
        <KeyboardAvoidingView
          style={{
            flex: 1,
          }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TextButton
            style={styles.cancel}
            textStyle={{
              color: Colors.system('purple', colorScheme),
            }}
            onPress={handleCancel}>
            {getTranslation('cancel')}
          </TextButton>
          <Divider />
          <TextInput
            style={[
              styles.textInput,
              {
                color: Colors.system('foreground', colorScheme),
              },
            ]}
            placeholderTextColor={Colors.system('purple', colorScheme)}
            multiline
            placeholder={getTranslation('assignmentContentPlaceholder')}
            value={content}
            onChangeText={setContent}
          />
          <Divider />
          {submittedAttachmentName && (
            <>
              <View style={styles.row}>
                <Icon
                  style={{marginRight: 5}}
                  name="attach-file"
                  size={18}
                  color={Colors.system('purple', colorScheme)}
                />
                <TextButton
                  style={{flex: 1}}
                  textStyle={{
                    color:
                      attachmentRemoved || fileResult
                        ? Colors.system('gray', colorScheme)
                        : Colors.system('purple', colorScheme),
                    textDecorationLine:
                      attachmentRemoved || fileResult ? 'line-through' : 'none',
                  }}
                  ellipsizeMode="tail">
                  {submittedAttachmentName}
                </TextButton>
                {!fileResult && (
                  <TextButton
                    style={{flex: 0}}
                    textStyle={{
                      color: Colors.system('red', colorScheme),
                    }}
                    onPress={handleRemove}>
                    {attachmentRemoved
                      ? getTranslation('undo')
                      : getTranslation('remove')}
                  </TextButton>
                )}
              </View>
              <Divider />
            </>
          )}
          {fileResult && (
            <>
              <View style={styles.row}>
                <Icon
                  style={{marginRight: 5}}
                  name="attach-file"
                  size={18}
                  color={Colors.system('purple', colorScheme)}
                />
                <TextButton
                  style={{flex: 1}}
                  textStyle={{
                    color: Colors.system('purple', colorScheme),
                  }}
                  ellipsizeMode="tail">
                  {fileResult.name!}
                </TextButton>
                {
                  <TextButton
                    style={{flex: 0}}
                    textStyle={{
                      color: Colors.system('red', colorScheme),
                    }}
                    onPress={handleRemoveNew}>
                    {getTranslation('remove')}
                  </TextButton>
                }
              </View>
              <Divider />
            </>
          )}
          {!fileResult && (
            <>
              <View style={styles.row}>
                <TextButton
                  disabled={attachmentRemoved}
                  textStyle={{
                    color: attachmentRemoved
                      ? Colors.system('gray', colorScheme)
                      : Colors.system('purple', colorScheme),
                  }}
                  onPress={handleFilePick}>
                  {submittedAttachmentName
                    ? getTranslation('newAttachment')
                    : getTranslation('addAttachment')}
                </TextButton>
                {submittedAttachmentName && (
                  <Text
                    style={[
                      iOSUIKit.footnote,
                      styles.note,
                      {
                        color: Colors.system('gray', colorScheme),
                      },
                    ]}>
                    {getTranslation('overwriteOld')}
                  </Text>
                )}
              </View>
              <Divider />
            </>
          )}
          <View
            style={[
              styles.row,
              {
                flexDirection: 'row-reverse',
              },
            ]}>
            <RaisedButton
              disabled={uploading}
              style={{
                backgroundColor: Colors.system('purple', colorScheme),
                width: 100,
                height: 40,
              }}
              textStyle={{color: 'white'}}
              onPress={handleSubmitPress}>
              {getTranslation('submit')}
            </RaisedButton>
            <ActivityIndicator
              style={{marginHorizontal: 16}}
              animating={uploading}
            />
            {uploading && (
              <ProgressBar
                progress={progress}
                style={{
                  width: window.width - 100 - 16 - 40 - 36,
                }}
                color={Colors.system('purple', colorScheme)}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </PaperProvider>
  );
};

export default AssignmentSubmitScreen;
