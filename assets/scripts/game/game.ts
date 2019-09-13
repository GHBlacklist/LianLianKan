import ccclass = cc._decorator.ccclass;
import property = cc._decorator.property;
import NodePool = cc.NodePool;

@ccclass
class game extends cc.Component {

    XCount;
    YCount;

    @property(cc.Node)
    item: cc.Node = null;
    @property(cc.Node)
    prefabParent: cc.Node = null;
    @property(cc.Label)
    lb_level: cc.Label = null;
    @property(cc.Node)
    win: cc.Node = null;
    @property(cc.Node)
    lose: cc.Node = null;
    @property(cc.Node)
    xiaochu: cc.Node = null;
    @property(cc.Node)
    ProgressBar: cc.Node = null;
    @property(cc.Node)
    setting: cc.Node = null;
    @property(cc.Node)
    yinxiao: cc.Node = null;
    @property(cc.Node)
    yinyue: cc.Node = null;

    limitTime;
    SprizeSizeDict = {};


    //地图
    map = [];//存放ID
    mapList = [];//二维数组存放所有的点
    itemDict = {};//表
    firstClick = null;//第一个选中的点
    promptNode1 = null;//提示点
    promptNode2 = null;//提示点
    time: number = 0;
    graphics;//画图
    sameIDList = {};//存储相同牌的位置
    levelDict = {};
    xiaochuPool: cc.NodePool = null;
    SysDataManager;
    ControlManager;
    end;
    backMusicID;

    onLoad() {
        this.node.on("SliderParagraph", this.OnEven_SliderParagraph, this);
        this.xiaochuPool = new NodePool();
        this.time = 0;
        this.graphics = this.prefabParent.getComponent(cc.Graphics);
        this.SysDataManager = require("SysDataManager").GetModel();
        this.ControlManager = require("ControlManager").GetModel();
        this.itemDict = this.SysDataManager.GetTableDict("item");
        this.levelDict = this.SysDataManager.GetTableDict("level");
        this.initMap();
        cc.audioEngine.stopAll();
        let volume = cc.sys.localStorage.getItem("BackVolume");
        volume = volume == 0 ? 0.01 : volume;
        this.backMusicID = cc.audioEngine.play(cc.url.raw("resources/sound/BackGound.mp3"), true, volume);
        cc.audioEngine.setVolume(this.backMusicID, volume);
        let that = this;
        this.ControlManager.CreateLoadPromise("config/projectConfig", cc.TextAsset, false)
            .then((textData) => {
                let value = textData.text.split("=")[1];
                let prompt = cc.find("prompt", that.node);
                prompt.active = value == 1;
                let refresh = cc.find("refresh", that.node);
                refresh.active = value == 1;
            });

    };

    initMap() {
        this.win.active = false;
        this.lose.active = false;
        this.setting.active = false;

        let itemDictIDList = Object.keys(this.itemDict);

        let level = cc.sys.localStorage.getItem("level") || 1;
        this.lb_level.string = "关卡:" + level;
        let levelConfig = this.levelDict[level];
        if(!levelConfig) {
            let keys = Object.keys(this.levelDict);
            levelConfig = this.levelDict[keys[keys.length - 1]];
        }
        this.XCount = levelConfig["XCount"];
        this.YCount = levelConfig["YCount"];
        let ItemCount = Math.min(Math.floor(this.XCount * this.YCount / 4), itemDictIDList.length);
        this.limitTime = levelConfig["Time"];
        this.time = 0;

        //初始化地图
        let IDList = [];
        while (IDList.length < ItemCount) {
            var ID = Number(itemDictIDList[Math.floor(Math.random() * itemDictIDList.length)]);
            if(IDList.indexOf(ID) == -1) {
                IDList.push(ID);
            }
        }

        let id = 0;
        for (var i = 0; i < this.XCount * this.YCount; i += 2) {
            //成对添加
            this.map.push(IDList[id]);
            this.map.push(IDList[id]);
            id++;
            if(id >= ItemCount) {
                id = 0;
            }
        }


        //改变位置
        for (var i = 0; i < this.map.length; i++) {
            let random = Math.floor(Math.random() * this.YCount * this.XCount);
            var item = this.map[i];
            this.map[i] = this.map[random];
            this.map[random] = item;
        }


        let layout = this.prefabParent.getComponent(cc.Layout);

        let startHeight = this.item.height;
        let startWidth = this.item.width;
        let proportion = startHeight / startWidth;
        this.item.width = Math.floor((this.prefabParent.width - layout["paddingLeft"] - layout["paddingRight"] - (this.YCount - 1) * layout["spacingX"]) / this.YCount);
        this.item.height = Math.floor((this.prefabParent.height - layout["paddingTop"] - layout["paddingBottom"] - (this.XCount - 1) * layout["spacingY"]) / this.XCount);
        let flag;
        if(this.item.width * proportion < this.item.height) {
            flag = "vertical";
            this.item.height = this.item.width * proportion;
        } else if(this.item.height / proportion < this.item.width) {
            flag = "horizontal";
            this.item.width = this.item.height / proportion;
        }

        let proportionHeight = startHeight / this.item.height;
        let proportionWidth = startWidth / this.item.width;

        let nodeMahjongBG = this.item.getChildByName("mahjongBG");
        nodeMahjongBG.height = nodeMahjongBG.height / proportionHeight;
        nodeMahjongBG.width = nodeMahjongBG.width / proportionWidth;

        let nodeMahjong = this.item.getChildByName("mahjong");
        nodeMahjong.height = nodeMahjong.height / proportionHeight;
        nodeMahjong.width = nodeMahjong.width / proportionWidth;

        let nodeXuanZhong = this.item.getChildByName("xuanzhong");
        nodeXuanZhong.height = nodeXuanZhong.height / proportionHeight;
        nodeXuanZhong.width = nodeXuanZhong.width / proportionWidth;

        //生成对应item和二维数组
        this.prefabParent.getComponent(cc.Layout).enabled = false;
        let startX;
        let startY;
        if(flag = "horizontal") {
            //左边界-(总宽度-总数量*单个宽带 - 空隙)
            let spacing = (this.prefabParent.width - (this.item.width * this.YCount + layout["spacingX"] * (this.YCount - 1))) / 2;
            startX = (-this.prefabParent.width * this.prefabParent.anchorX) + spacing + this.item.width * this.item.anchorX;
            //父节点上边界坐标-layout-子节点上边界到中心点距离
            startY = this.prefabParent.height * (1 - this.prefabParent.anchorY) - layout["paddingTop"] - this.item.height * (1 - this.item.anchorY);
        } else {
            startX = (-this.prefabParent.width * this.prefabParent.anchorX) + layout["paddingLeft"] + this.item.width * this.item.anchorX;
            let spacing = (this.prefabParent.height - (this.item.height * this.XCount + layout["spacingY"] * (this.XCount - 1))) / 2;
            startY = this.prefabParent.height * (1 - this.prefabParent.anchorY) - spacing - this.item.height * this.item.anchorY;
        }

        let XNum = 1;
        let Count = 0;
        for (var i = 0; i < this.map.length; i++) {
            if(Count >= this.YCount) {
                Count = 0;
                XNum++;
            }
            var id = this.map[i];

            let prefab = cc.instantiate(this.item);
            prefab.parent = this.prefabParent;
            prefab.getChildByName("mahjongBG").width = this.item.getChildByName("mahjongBG").width;
            prefab.getChildByName("mahjongBG").height = this.item.getChildByName("mahjongBG").height;
            prefab.getChildByName("mahjong").width = this.item.getChildByName("mahjong").width;
            prefab.getChildByName("mahjong").height = this.item.getChildByName("mahjong").height;
            prefab.getChildByName("xuanzhong").width = this.item.getChildByName("xuanzhong").width;
            prefab.getChildByName("xuanzhong").height = this.item.getChildByName("xuanzhong").height;
            prefab["ID"] = id;

            if(Count == 0) {
                prefab.x = startX;
            } else {
                prefab.x = startX + Count * this.item.width + layout["spacingX"] * Count;
            }

            if(XNum == 1) {
                prefab.y = startY;
            } else {
                prefab.y = startY - (XNum - 1) * this.item.height - layout["spacingY"] * (XNum - 1);
            }

            let image = this.itemDict[id]["FilePath"];
            this.SetImage(prefab, image);



            if(!this.mapList[XNum]) {
                this.mapList[XNum] = [];
            }
            prefab["XArray"] = XNum;
            prefab["YArray"] = Count + 1;
            this.mapList[XNum].push(prefab);

            if(!this.sameIDList[id]) {
                this.sameIDList[id] = [];
            }
            this.sameIDList[id].push(prefab);


            Count++;
        }

        for (var i = 1; i <= this.XCount; i++) {
            let firstPrefab = cc.instantiate(this.item);
            firstPrefab.parent = this.prefabParent;
            firstPrefab["ID"] = 0;
            firstPrefab["XArray"] = i;
            firstPrefab["YArray"] = 0;
            firstPrefab.x = this.mapList[i][0].x - layout["paddingLeft"] - this.item.width * this.item.anchorX;
            firstPrefab.y = this.mapList[i][0].y;
            firstPrefab.active = false;

            let lastPrefab = cc.instantiate(this.item);
            lastPrefab.parent = this.prefabParent;
            lastPrefab["ID"] = 0;
            lastPrefab["XArray"] = i;
            lastPrefab["YArray"] = this.YCount + 1;
            lastPrefab.x = this.mapList[i][this.YCount - 1].x + layout["paddingRight"] + this.item.width * this.item.anchorY;
            lastPrefab.y = this.mapList[i][this.YCount - 1].y;
            lastPrefab.active = false;

            this.mapList[i].unshift(firstPrefab);
            this.mapList[i].push(lastPrefab);
        }

        let firstRow = [];
        let lastRow = [];
        for (var i = 0; i < this.YCount + 2; i++) {
            let firstPrefab = cc.instantiate(this.item);
            firstPrefab.parent = this.prefabParent;
            firstPrefab["ID"] = 0;
            firstPrefab["XArray"] = 0;
            firstPrefab["YArray"] = i;
            firstPrefab.x = this.mapList[1][i].x;
            firstPrefab.y = this.mapList[1][i].y + layout["paddingTop"] + this.item.height * this.item.anchorY;
            firstPrefab.active = false;
            firstRow.push(firstPrefab);

            let lastPrefab = cc.instantiate(this.item);
            lastPrefab.parent = this.prefabParent;
            lastPrefab["ID"] = 0;
            lastPrefab["XArray"] = this.XCount + 1;
            lastPrefab["YArray"] = i;
            lastPrefab.x = this.mapList[this.XCount][i].x;
            lastPrefab.y = this.mapList[this.XCount][i].y - layout["paddingBottom"] - this.item.height * this.item.anchorY;
            lastPrefab.active = false;
            lastRow.push(lastPrefab);

        }
        this.mapList[0] = firstRow;
        this.mapList.push(lastRow);

        this.end = false;
    }


    ResetSize(node) {
        node.getChildByName("mahjong").width = this.item.getChildByName("mahjong").width;
        node.getChildByName("mahjong").height = this.item.getChildByName("mahjong").height;
        let proportion = this.SprizeSizeDict[node.ID].height / this.SprizeSizeDict[node.ID].width;
        let nodeMahjong = node.getChildByName("mahjong");
        if(nodeMahjong.width * proportion < nodeMahjong.height) {
            nodeMahjong.height = nodeMahjong.width * proportion;
        } else if(nodeMahjong.height / proportion < nodeMahjong.width) {
            nodeMahjong.width = nodeMahjong.height / proportion;
        }
    }

    SetImage(node, image) {
        if(node["ID"] == 0) {
            node.active = false;
            return;
        }
        let spriteNode = node.getChildByName("mahjong");
        let Sprite = spriteNode.getComponent(cc.Sprite);
        this.ControlManager.CreateSpritePromise(image)
            .then((spriteFrame) => {
                Sprite["spriteFrame"] = spriteFrame;
                this.SprizeSizeDict[node["ID"]] = spriteFrame["_originalSize"];
                this.ResetSize(node);
            });
    }

    OnClick(eventTouch: cc.Event.EventTouch,) {
        let btnNode = eventTouch.currentTarget;
        this.click(btnNode);
    }

    Play(nodeList) {
        let list = [];
        for (var i = 0; i < nodeList.length; i++) {
            let node = nodeList[i];
            let xiaochu = this.xiaochuPool.get();
            if (!xiaochu) {
                xiaochu = cc.instantiate(this.xiaochu);
            }
            xiaochu.active = true;
            xiaochu.parent = node;
            xiaochu.setPosition(0, 0);
            xiaochu.getComponent(cc.Animation).play();
            list.push(xiaochu);
        }
        this.scheduleOnce( () => {//特效播放完毕
            for (var i = 0; i < list.length; i++) {
                let xiaochu = list[i];
                let node = nodeList[i];
                this.xiaochuPool.put(xiaochu);
                node.active = false;
                this.DisClickNode(node);
            }
            this.graphics.clear();
            this.IsNeedRefresh();
        }, 0.5);
    }


    /*
    graphics不是以世界坐标系的0,0为起点画线而是以当前绑定节点的左下角为0,0点划线
     */

    //画线
    DrawLine(pathNodeList) {

        this.graphics.clear();
        for (var i = 0; i < pathNodeList.length - 1; i++) {
            var firstNode = pathNodeList[i];
            var secondNode = pathNodeList[i + 1];
            let wordNode1 = firstNode.getPosition();// this.prefabParent.convertToWorldSpaceAR(firstNode);
            let wordNode2 = secondNode.getPosition();//this.prefabParent.convertToWorldSpaceAR(secondNode);
            this.graphics.moveTo(wordNode1.x, wordNode1.y);
            this.graphics.lineTo(wordNode2.x, wordNode2.y);
            // this.graphics.moveTo(wordNode1.x - 105, wordNode1.y - 50);
            // this.graphics.lineTo(wordNode2.x - 105, wordNode2.y - 50);
            this.graphics.stroke();
        }

    }


    update(dt) {
        this.time += dt;
        this.ProgressBar.getComponent(cc.ProgressBar)["progress"] = 1 - this.time / this.limitTime;
        if(this.time >= this.limitTime && !this.end) {
            this.lose.active = true;
        }
    }


    //大于两个拐点的不算连接
    //2拐点
    MatchBolckTwo(startNode, endNode) {
        if(this.mapList == null || this.mapList.length == 0){
            return null;
        }
        if(startNode.XArray < 0 || startNode.XArray > this.mapList.length) {
            return null;
        }
        if(startNode.YArray < 0 || (this.mapList[0] && startNode.YArray > this.mapList[0].length)){
            return null;
        }
        if(endNode.XArray < 0 || endNode.XArray > this.mapList.length){
            return null;
        }
        if(endNode.YArray < 0 || (this.mapList[0] &&endNode.YArray > this.mapList[0].length)){
            return null;
        }
        let pathList = [];
        // 判断0折连接
        if(this.MatchBolck(startNode, endNode)) {
            return pathList;
        }

        let minNode = this.MatchBolckOne(startNode, endNode);
        // 判断1折连接
        if(minNode != null) {
            pathList.push(minNode);
            return pathList;
        }

        // 判断2折连接
        //想左扫描是否存在一个点与startNode是0折链接,同时与endNode是1折链接
        for(var i = startNode.YArray + 1; i < this.mapList[startNode.XArray].length; i++) {
            if(this.mapList[startNode.XArray][i].active === false) {
                let minNode = this.mapList[startNode.XArray][i];
                let minResult = this.MatchBolckOne(minNode, endNode);
                if(minResult != null) {
                    pathList.push(minNode);
                    pathList.push(minResult);
                    return pathList;
                }
            } else {
                break;
            }
        }
        //向右扫描
        for(var i = startNode.YArray - 1; i > -1; i--) {
            if(this.mapList[startNode.XArray][i].active === false) {
                let minNode = this.mapList[startNode.XArray][i];
                let minResult = this.MatchBolckOne(minNode, endNode);
                if(minResult != null) {
                    pathList.push(minNode);
                    pathList.push(minResult);
                    return pathList;
                }
            } else {
                break;
            }
        }
        //向下扫描
        for(var i = startNode.XArray + 1; i < this.mapList.length; i++) {
            if(this.mapList[i][startNode.YArray].active === false) {
                let minNode = this.mapList[i][startNode.YArray];
                let minResult = this.MatchBolckOne(minNode, endNode);
                if(minResult != null) {
                    pathList.push(minNode);
                    pathList.push(minResult);
                    return pathList;
                }
            } else {
                break;
            }
        }
        //向上
        for(var i = startNode.XArray - 1; i > -1; i--) {
            if(this.mapList[i][startNode.YArray].active === false) {
                let minNode = this.mapList[i][startNode.YArray];
                let minResult = this.MatchBolckOne(minNode, endNode);
                if(minResult != null) {
                    pathList.push(minNode);
                    pathList.push(minResult);
                    return pathList;
                }
            } else {
                break;
            }
        }
        return null;

    }

    //1拐点判断
    MatchBolckOne(startNode, endNode) {
        // 如果不属于1折连接则返回null
        if(startNode.XArray == endNode.XArray || startNode.YArray == endNode.YArray)
            return null;

        // 测试对角点1
        let minNode = this.mapList[startNode.XArray][endNode.YArray];
        if(minNode.active === false) {
            let stResult = this.MatchBolck(startNode, minNode);
            let tdResult = stResult ? this.MatchBolck(minNode, endNode) : stResult;
            if (stResult && tdResult) {
                return minNode;
            }
        }

        // 测试对角点2
        minNode = this.mapList[endNode.XArray][startNode.YArray];
        if(minNode.active === false) {
            let stResult = this.MatchBolck(startNode, minNode);
            let tdResult = stResult ? this.MatchBolck(minNode, endNode) : stResult;
            if (stResult && tdResult) {
                return minNode;
            }
        }
        return null;

    }

    //0拐点判断,既同一条线上
    MatchBolck(startNode, endNode) {
        // 如果不属于0折连接则返回false
        if(startNode.XArray != endNode.XArray && startNode.YArray != endNode.YArray){
            return false;
        }

        let min, max;

        // 如果两点的x坐标相等，则在水平方向上扫描
        if(startNode.XArray == endNode.XArray) {
            min = startNode.YArray < endNode.YArray ? startNode.YArray : endNode.YArray;
            max = startNode.YArray > endNode.YArray ? startNode.YArray : endNode.YArray;
            for(min++; min < max; min++) {
                if(this.mapList[startNode.XArray][min].active === true) {
                    return false;
                }
            }
        }
        // 如果两点的y坐标相等，则在竖直方向上扫描
        else {
            min = startNode.XArray < endNode.XArray ? startNode.XArray : endNode.XArray;
            max = startNode.XArray > endNode.XArray ? startNode.XArray : endNode.XArray;
            for(min++; min < max; min++) {
                if(this.mapList[min][startNode.YArray].active === true)
                    return false;
            }
        }
        return true;
    }

    prompt() {
        this.playSound();
        if(this.firstClick) {
            this.DisClickNode(this.firstClick);
            this.firstClick = null;
        }
        if(this.promptNode1) {
            this.DisClickNode(this.promptNode1);
            this.promptNode1 = null;
        } if(this.promptNode2) {
            this.DisClickNode(this.promptNode2);
            this.promptNode2 = null;
        }

        let keyList = Object.keys(this.sameIDList);
        let length = keyList.length;
        let random1 = Math.floor(Math.random() * length);
        for (var i = random1; i < length + random1; i++) {
            var iDList = this.sameIDList[keyList[(i + length) % length]];
            let idListLength = iDList.length;
            let random2 = Math.floor(Math.random() * idListLength);
            for (var j = random2; j < idListLength + random2; j++) {
                for (var k = j + 1; k < idListLength + random2; k++) {
                    var node1 = iDList[(j + idListLength) % idListLength];
                    var node2 = iDList[(k + idListLength) % idListLength];
                    let result = this.MatchBolckTwo(node1, node2);
                    if(!!result) {
                        this.promptNode1 = node1;
                        this.promptNode2 = node2;
                        this.click(node1);
                        this.click(node2);
                        return;
                    }
                }

            }
        }

    }

    click(btnNode) {
        this.playSound();
        if(!this.firstClick) {
            this.firstClick = btnNode;
            if(this.promptNode1 != null && this.promptNode2 != null && this.firstClick != this.promptNode1 && this.firstClick != this.promptNode2) {
                this.DisClickNode(this.promptNode1);
                this.DisClickNode(this.promptNode2);
            }
            this.ClickNode(btnNode);
        } else if(btnNode.ID != this.firstClick.ID || this.firstClick == btnNode) {
            this.DisClickNode(this.firstClick);
            if(this.promptNode1) {
                this.DisClickNode(this.promptNode1);
            }
            if(this.promptNode2) {
                this.DisClickNode(this.promptNode2);
            }
            this.firstClick = null;
        } else {
            let result = this.MatchBolckTwo(this.firstClick, btnNode);
            if(!result) {
                this.DisClickNode(this.firstClick);
                if(this.promptNode1) {
                    this.DisClickNode(this.promptNode1);
                }
                if(this.promptNode2) {
                    this.DisClickNode(this.promptNode2);
                }
                this.firstClick = null;
            } else {
                //选中
                this.ClickNode(btnNode);
                //画线
                result.unshift(this.firstClick);
                result.push(btnNode);
                this.DrawLine(result);

                //更新sameIdList
                let iDList = this.sameIDList[this.firstClick.ID];
                this.sameIDList[this.firstClick.ID] = iDList.filter( value => {
                    let isFirst = value["XArray"] == this.firstClick.XArray && value["YArray"] == this.firstClick.YArray;
                    let isSecond = value["XArray"] == btnNode.XArray && value["YArray"] == btnNode.YArray;
                    return !isFirst && !isSecond;
                });
                //更新map
                this.map.splice(this.map.indexOf(this.firstClick.ID), 1);
                this.map.splice(this.map.indexOf(btnNode.ID), 1);
                //特效
                this.Play([this.firstClick, btnNode]);
                this.scheduleOnce(() => {
                    this.IsNeedRefresh();
                }, 0.5);
                //隐藏
                this.firstClick = null;


            }
        }
    }

    RefreshMap(isPlay) {
        if(isPlay !== false) {
            this.playSound();
        }
        this.graphics.clear();
        if(this.firstClick) {
            this.DisClickNode(this.firstClick);
            this.firstClick = null;
        }
        if(this.promptNode1) {
            this.DisClickNode(this.promptNode1);
            this.promptNode1 = null;
        } if(this.promptNode2) {
            this.DisClickNode(this.promptNode2);
            this.promptNode2 = null;
        }
        this.sameIDList = {};
        let length = this.map.length;

        //改变位置
        for (var i = 0; i < length; i++) {
            let random = Math.floor(Math.random() * length);
            var item = this.map[i];
            this.map[i] = this.map[random];
            this.map[random] = item;

        }

        //赋值
        let Count = 0;
        for (var i = 0; i < this.mapList.length; i++) {
            let row = this.mapList[i];
            for (var j = 0; j < row.length; j++) {
                var element = row[j];
                if(element.active === true) {
                    let ID = this.map[Count];
                    element["ID"] = ID;
                    let image = this.itemDict[ID]["FilePath"];
                    this.SetImage(element, image);

                    if(!this.sameIDList[ID]) {
                        this.sameIDList[ID] = [];
                    }
                    this.sameIDList[ID].push(element);

                    Count++;
                    if(Count == length) {
                        return;
                    }

                }
            }

        }
    }

    IsNeedRefresh() {
        let keyList = Object.keys(this.sameIDList);
        let length = keyList.length;
        for (var i = 0; i < length ; i++) {
            var iDList = this.sameIDList[keyList[i]];
            let idListLength = iDList.length;
            for (var j = 0; j < idListLength; j++) {
                for (var k = j + 1; k < idListLength; k++) {
                    var node1 = iDList[j];
                    var node2 = iDList[k];
                    let result = this.MatchBolckTwo(node1, node2);
                    if(!!result) {
                        return;
                    }
                }

            }
        }
        if(this.map.length == 0) {
            let level = Number(cc.sys.localStorage.getItem("level"));
            cc.sys.localStorage.setItem("level", level + 1);
            this.win.active = true;
        } else {
            this.RefreshMap(false);
        }
    }

    //选中
    ClickNode(node) {
        node.getChildByName("xuanzhong").active = true;
    }

    //取消选中
    DisClickNode(node) {
        node.getChildByName("xuanzhong").active = false;
    }

    Sure() {
        this.playSound();
        this.win.active = false;
        cc.director.loadScene("gameScene");
    }

    GoBack() {
        this.playSound();
        cc.director.loadScene("startScene");
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

    OnEven_SliderParagraph(event) {
        let thisParentName = event.node.parent.name;
        let volume = Number(event["progress"]);
        if (thisParentName == "yinyue") {
            this.yinyue.getChildByName("Slider").getChildByName("ProgressBar").getComponent(cc.ProgressBar)["progress"] = volume;
            cc.sys.localStorage.setItem("BackVolume", volume);
            cc.audioEngine.setVolume(this.backMusicID, volume);
        }
        else if (thisParentName == "yinxiao") {
            this.yinxiao.getChildByName("Slider").getChildByName("ProgressBar").getComponent(cc.ProgressBar)["progress"] = volume;
            cc.sys.localStorage.setItem("SpVolume", volume);
        }
    }

    playSound () {
        let volume = cc.sys.localStorage.getItem("SpVolume");
        cc.audioEngine.play(cc.url.raw("resources/sound/button.mp3"), false, volume);
    }
}