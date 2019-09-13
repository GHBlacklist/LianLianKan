/*
 客户端系统配置表管理器
 */

export class SysDataManager extends cc.Component {

    //字段key开始行
    private FieldLine = 1;

    private tableDict = {};

    constructor() {
        super();

    }

    // 获取表字典数据
    GetTableDict(tableName: string) {
        var nameList = tableName.split(".");
        tableName = nameList[0];
        //如果表为读取，则读取
        if (!this.tableDict.hasOwnProperty(tableName)) {
            return {}
        }

        return this.tableDict[tableName]
    }

    // 表数据读取完成
    OnLoadTableEnd(tableName: string, keyNameList: string[], textData: any, tableInfo: any = {}) {

        let readTableInfo: any = this.TransformTextData(tableName, textData);
        if (!readTableInfo) {
            return false;
        }
        tableInfo = readTableInfo;
        this.tableDict[tableName] = tableInfo;

        return true;
    }

    // 转化表为字典
    TransformTextData(tableName: string, textData: any) {

        let textDataList = textData.split("\n");
        let lineCount = textDataList.length;
        if (!lineCount) {
            return null;
        }
        let lineNum = -1;

        let fieldNameList = null;
        let fieldCount = null;

        let tableDataDict: any = {};

        for (let index_i = 0; index_i < lineCount; index_i++) {
            let textLineDataStr = textDataList[index_i];

            //去除空格
            textLineDataStr = textLineDataStr.replace(/(\s*$)/g, "");
            //读到最后一行，跳出//空行跳过
            if (!textLineDataStr) {
                continue
            }
            lineNum += 1;
            let textLineDataList = textLineDataStr.split("\t");

            //如果是key行,记录key数据
            if (lineNum === this.FieldLine) {
                fieldNameList = textLineDataList;
                fieldCount = fieldNameList.length;
            }
            else if (lineNum > this.FieldLine) {

                let rowCount = textLineDataList.length;
                if (rowCount != fieldCount) {
                    return null;
                }
                let rowKey = textLineDataList[0];
                let rowDataDict: any = {};
                for (var index_j = 0; index_j < fieldCount; index_j++) {
                    let value = textLineDataList[index_j];
                    let fieldName = fieldNameList[index_j];

                    try {
                        value = this.GetTransformValue(tableName, fieldName, value);
                    }
                    catch (error) {
                        value = undefined;
                    }
                    rowDataDict[fieldName] = value;
                }
                tableDataDict[rowKey] = rowDataDict;
            }
        }

        return tableDataDict
    }

    /**
     * 获取value转化后的值
     */
    GetTransformValue(tableName: string, fieldName: string, valueStr: any) {
        let startStr = valueStr[0];
        let endStr = valueStr[valueStr.length - 1];
        let LowerValueStr = valueStr.toLowerCase();
        if (LowerValueStr === "false") {
            return false
        }
        else if (LowerValueStr === "true") {
            return true
        }
        //如果是列表
        if (startStr === "[" && endStr === "]") {
            try {
                return JSON.parse(valueStr);
            } catch (e) {
                return valueStr;
            }
        }
        else if (startStr === "{" && endStr === "}") {
            try {
                return JSON.parse(valueStr);
            } catch (e) {
                return valueStr;
            }
        }
        else if (valueStr.indexOf("return") != -1) {
            return new Function(valueStr);
        }
        else {
            if (valueStr == "") {
                return valueStr
            }
            //去整
            //如果不是纯数字,则为字符串
            else if (isNaN(valueStr)) {
                return valueStr
            }
            else {
                return Number(valueStr)
            }
        }

    }

}


var g_SysDataManager: SysDataManager = null;

/**
 * 绑定模块外部方法
 */
export function GetModel() {
    if (!g_SysDataManager) {
        g_SysDataManager = new SysDataManager();
    }
    return g_SysDataManager;
}