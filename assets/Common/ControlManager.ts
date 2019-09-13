/*
    控制器管理器
*/

export class ControlManager extends cc.Component {

    cacheDataDict: { [ket: string]: cc.Asset } = {};
    cacheSpriteDict: { [ket: string]: cc.Asset } = {};//贴图资源缓存字典

    constructor() {
        super();
    }

    //---------------加载资源-----------------


    //创建异步下载资源对象
    /**
     * @ release - 加载完成后释放这个资源
     */
    CreateLoadPromise(resPath: string, resType: typeof cc.Asset, retainRes = true) {

        //如果已经加载
        if (this.cacheDataDict.hasOwnProperty(resPath)) {
            let loadData = this.cacheDataDict[resPath];
            return Promise.resolve(loadData)
        }

        //创建异步函数
        let promisefunc = (resolve: Function, reject: Function) => {
            //加载资源
            cc.loader.loadRes(resPath, resType, (error: Error, loadData: cc.Asset) => {
                if (error) {
                    reject(error);
                    return
                }
                this.cacheDataDict[resPath] = loadData;

                resolve(loadData);

            });
        };
        //返回异步对象
        return new Promise(promisefunc);
    }

    //创建异步下载贴图资源对象

    /**
     * @ release - 加载完成后释放这个资源,staticRes - 是否静态资源,永久保存,不会释放
     */
    CreateSpritePromise(resPath: string) {
        let that = this;

        //如果已经加载
        if (this.cacheSpriteDict.hasOwnProperty(resPath)) {
            let loadData = this.cacheSpriteDict[resPath];
            return Promise.resolve(loadData)
        }

        //创建异步函数
        let promisefunc = (resolve: Function, reject: Function) => {
            let supportJit = cc["supportJit"];
            cc["supportJit"] = false;
            //加载资源
            cc.loader.loadRes(resPath, cc.SpriteFrame, (error: Error, loadData: cc.Asset) => {

                if (error) {
                    reject(error);
                    return
                }
                that.cacheSpriteDict[resPath] = loadData;

                resolve(loadData);
            });
            cc["supportJit"] = supportJit;
        };
        //返回异步对象
        return new Promise(promisefunc);
    }


}


var g_ControlManager: ControlManager = null;

/**
 * 绑定模块外部方法
 */
export var GetModel = function () {
    if (!g_ControlManager) {
        g_ControlManager = new ControlManager();
    }
    return g_ControlManager;
}