import ccclass = cc._decorator.ccclass;
import property = cc._decorator.property;


var configList = [
    "level",
    "item",
];

@ccclass
class startScene extends cc.Component {

    @property(cc.Node)
    rule: cc.Node = null;
    @property(cc.Node)
    setting: cc.Node = null;
    @property(cc.Node)
    yinxiao: cc.Node = null;
    @property(cc.Node)
    yinyue: cc.Node = null;

    ControlManager;
    SysDataManager;

    onLoad() {
        this.node.on("SliderParagraph", this.OnEven_SliderParagraph, this);
        this.ControlManager = require("ControlManager").GetModel();
        this.SysDataManager = require("SysDataManager").GetModel();
        this.InitTable();
    }

    OnEven_SliderParagraph(event) {
        let thisParentName = event.node.parent.name;
        let volume = Number(event["progress"]);
        if (thisParentName == "yinyue") {
            cc.sys.localStorage.setItem("BackVolume", volume);
            this.yinyue.getChildByName("Slider").getChildByName("ProgressBar").getComponent(cc.ProgressBar)["progress"] = volume;
        }
        else if (thisParentName == "yinxiao") {
            cc.sys.localStorage.setItem("SpVolume", volume);
            this.yinxiao.getChildByName("Slider").getChildByName("ProgressBar").getComponent(cc.ProgressBar)["progress"] = volume;
        }
    }

    startGame() {
        this.playSound();
        cc.director.loadScene("gameScene");
    }

    gameRule() {
        this.playSound();
        this.rule.active = true;
    }

    CloseRule() {
        this.playSound();
        this.rule.active = false;
    }

    Setting() {
        this.playSound();
        this.setting.active = true;
        this.yinyue.getChildByName("Slider").getComponent(cc.Slider)["progress"] = cc.sys.localStorage.getItem("BackVolume");
        this.yinxiao.getChildByName("Slider").getComponent(cc.Slider)["progress"] = cc.sys.localStorage.getItem("SpVolume");
        this.yinyue.getChildByName("Slider").getChildByName("ProgressBar").getComponent(cc.ProgressBar)["progress"] = cc.sys.localStorage.getItem("BackVolume");
        this.yinxiao.getChildByName("Slider").getChildByName("ProgressBar").getComponent(cc.ProgressBar)["progress"] = cc.sys.localStorage.getItem("SpVolume");
    }

    CloseSetting() {
        this.playSound();
        this.setting.active = false;
    }

    //初始化表数据
    InitTable() {

        let allTableDataDict = [];
        let loadTableCount = 0;
        for (var i = 0; i < configList.length; i++) {
            let tableName = configList[i];
            let tablePath = ["config", tableName].join("/");
            this.ControlManager.CreateLoadPromise(tablePath, cc.TextAsset, false)
                .then((textData: cc.TextAsset) => {

                    if (!textData.text) {
                        cc.error("tableName:%s not textData", tableName);
                        textData.text = "";
                    }

                    cc.log("配置表资源读取成功:" + tableName);
                    loadTableCount += 1;
                    allTableDataDict[tableName] = {"Data": textData.text, "KeyNameList": null};
                    if (loadTableCount >= configList.length) {
                        this.initTable(allTableDataDict);
                    }
                })
                .catch((error) => {
                    cc.error("加载配置表失败:" + tablePath);
                })
        }
    }

    //初始化表数据
    initTable(allTableDataDict) {
        let allTableNameList = Object.keys(allTableDataDict);
        let count = allTableNameList.length;
        for (let index = 0; index < count; index++) {
            let tableName = allTableNameList[index];
            let tableInfo = allTableDataDict[tableName];
            if (!this.SysDataManager.OnLoadTableEnd(tableName, tableInfo["KeyNameList"], tableInfo["Data"])) {
                return false;
            }
        }
        let itemDict = this.SysDataManager.GetTableDict("item");
        for (var key in itemDict) {
            let item = itemDict[key];
            let image = item["FilePath"];
            this.ControlManager.CreateSpritePromise(image)
                .then(() => {
                    cc.log("加载图片成功" + image)
                });
        }
        return true;
    }

    playSound() {
        let volume = cc.sys.localStorage.getItem("SpVolume");
        cc.audioEngine.play(cc.url.raw("resources/sound/button.mp3"), false, volume);
    }
}