import React from "react";
import {
  FlatList,
  ListRenderItem,
  RefreshControl,
  SafeAreaView
} from "react-native";
import Colors from "../constants/Colors";
import { ICourse, IFile } from "../redux/types/state";
import FileCard from "./FileCard";

export interface IFilesViewProps {
  readonly courses?: ReadonlyArray<ICourse>;
  readonly files: ReadonlyArray<IFile>;
  readonly isFetching: boolean;
  readonly onFileCardPress: (
    filename: string,
    url: string,
    ext: string
  ) => void;
  readonly onRefresh?: () => void;
  readonly pinnedFiles?: readonly string[];
  readonly onPinned?: (pin: boolean, fileId: string) => void;
}

const FilesView: React.FunctionComponent<IFilesViewProps> = props => {
  const {
    files: rawFiles,
    onFileCardPress,
    courses,
    isFetching,
    onRefresh,
    onPinned
  } = props;

  const pinnedFiles = props.pinnedFiles || [];

  const files: ReadonlyArray<IFile> = [
    ...rawFiles.filter(item => pinnedFiles.includes(item.id)),
    ...rawFiles.filter(item => !pinnedFiles.includes(item.id))
  ];

  const renderListItem: ListRenderItem<IFile> = ({ item }) => {
    if (courses) {
      const course = courses.find(course => course.id === item.courseId);
      if (course) {
        return (
          <FileCard
            title={item.title}
            extension={item.fileType}
            size={item.size}
            date={item.uploadTime}
            description={item.description}
            markedImportant={item.markedImportant}
            pinned={pinnedFiles.includes(item.id)}
            // tslint:disable-next-line: jsx-no-lambda
            onPinned={pin => onPinned!(pin, item.id)}
            courseName={course.name}
            courseTeacherName={course.teacherName}
            // tslint:disable-next-line: jsx-no-lambda
            onPress={() =>
              onFileCardPress(item.title, item.downloadUrl, item.fileType)
            }
          />
        );
      }
    }
    return (
      <FileCard
        title={item.title}
        extension={item.fileType}
        size={item.size}
        date={item.uploadTime}
        description={item.description}
        markedImportant={item.markedImportant}
        // tslint:disable-next-line: jsx-no-lambda
        onPress={() =>
          onFileCardPress(item.title, item.downloadUrl, item.fileType)
        }
      />
    );
  };

  const keyExtractor = (item: any) => item.id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f0f0" }}>
      <FlatList
        data={files}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={onRefresh}
            colors={[Colors.tint]}
          />
        }
      />
    </SafeAreaView>
  );
};

export default FilesView;
